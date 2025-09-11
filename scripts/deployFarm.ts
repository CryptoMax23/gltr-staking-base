import * as hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber, Signer, Contract, Wallet } from "ethers";
import {
  DefenderRelaySigner,
  DefenderRelayProvider,
} from "defender-relay-client/lib/ethers";

import { sleep, address } from "../helpers/utils";

interface Allocation {
  points: BigNumber;
  address: String;
  withUpdate: Boolean;
}

async function main() {
  let tx;
  const allocations: Allocation[] = [
    {
      points: BigNumber.from(1),
      address: "0x73958d46B7aA2bc94926d8a215Fa560A5CdCA3eA", // wapGHST
      withUpdate: false,
    },
    {
      points: BigNumber.from(3),
      address: "0xfEC232CC6F0F3aEb2f81B2787A9bc9F6fc72EA5C", // ghst-fud
      withUpdate: false,
    },
    {
      points: BigNumber.from(3),
      address: "0x641CA8d96b01Db1E14a5fBa16bc1e5e508A45f2B", // ghst-fomo
      withUpdate: false,
    },
    {
      points: BigNumber.from(3),
      address: "0xC765ECA0Ad3fd27779d36d18E32552Bd7e26Fd7b", // ghst-alpha
      withUpdate: true,
    },
    {
      points: BigNumber.from(3),
      address: "0xBFad162775EBfB9988db3F24ef28CA6Bc2fB92f0", // ghst-kek
      withUpdate: true,
    },
    {
      points: BigNumber.from(3),
      address: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4", // ghst-usdc
      withUpdate: true,
    },
    {
      points: BigNumber.from(1),
      address: "0xf69e93771F11AECd8E554aA165C3Fe7fd811530c", // ghst-matic
      withUpdate: true,
    },
  ];
  const credentials = {
    apiKey: process.env.DEFENDER_API_KEY,
    apiSecret: process.env.DEFENDER_API_SECRET,
  };
  const provider = new DefenderRelayProvider(credentials);
  const owner = new DefenderRelaySigner(credentials, provider, {
    speed: "fast",
  });
  const DiamondCutFacet = await hre.ethers.getContractFactory(
    "DiamondCutFacet"
  );
  const diamondCutFacet = await DiamondCutFacet.connect(owner).deploy();
  await diamondCutFacet.deployed();
  console.log("DiamondCutFacet: " + diamondCutFacet.address);
  const DiamondLoupeFacet = await hre.ethers.getContractFactory(
    "DiamondLoupeFacet"
  );
  const diamondLoupeFacet = await DiamondLoupeFacet.connect(owner).deploy();
  await diamondLoupeFacet.deployed();
  console.log("DiamondLoupeFacet: " + diamondLoupeFacet.address);
  const OwnershipFacet = await hre.ethers.getContractFactory("OwnershipFacet");
  let ownershipFacet = await OwnershipFacet.connect(owner).deploy();
  await ownershipFacet.deployed();
  console.log("OwnershipFacet: " + ownershipFacet.address);
  const FarmFacet = await hre.ethers.getContractFactory("FarmFacet");
  let farmFacet = await FarmFacet.connect(owner).deploy();
  await farmFacet.deployed();
  console.log("FarmFacet: " + farmFacet.address);
  const FarmInit = await hre.ethers.getContractFactory("FarmInit");
  const farmInit = await FarmInit.connect(owner).deploy();
  await farmInit.deployed();
  console.log("FarmInit: " + farmInit.address);
  const ReentrancyGuardInit = await hre.ethers.getContractFactory(
    "ReentrancyGuardInit"
  );
  const reentrancyGuardInit = await ReentrancyGuardInit.connect(owner).deploy();
  await reentrancyGuardInit.deployed();
  console.log("ReentrancyGuardInit: " + reentrancyGuardInit.address);

  const GAXLiquidityTokenReward = await hre.ethers.getContractFactory(
    "GAXLiquidityTokenReward"
  );
  const gaxLiquidityTokenReward = await GAXLiquidityTokenReward.connect(
    owner
  ).deploy();
  await gaxLiquidityTokenReward.deployed();
  console.log("GAXLiquidityTokenReward: " + gaxLiquidityTokenReward.address);

  const FarmAndGLTRDeployer = await hre.ethers.getContractFactory(
    "FarmAndGLTRDeployer"
  );
  const farmAndGLTRDeployer = await FarmAndGLTRDeployer.connect(owner).deploy();
  await farmAndGLTRDeployer.deployed();
  console.log("FarmAndGLTRDeployer: " + farmAndGLTRDeployer.address);

  const Diamond = await hre.ethers.getContractFactory("Diamond");
  const diamond = await Diamond.connect(owner).deploy(
    farmAndGLTRDeployer.address,
    diamondCutFacet.address
  );
  await diamond.deployed();
  console.log("Diamond: " + diamond.address);

  tx = await gaxLiquidityTokenReward
    .connect(owner)
    .transfer(
      "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c",
      ethers.utils.parseEther("10000")
    );
  await tx.wait();

  tx = await gaxLiquidityTokenReward
    .connect(owner)
    .transfer(
      diamond.address,
      await gaxLiquidityTokenReward.balanceOf(await owner.getAddress())
    );
  await tx.wait();
  console.log("GAXLiquidityTokenReward transferred to Diamond");

  const deployedAddresses = {
    diamond: diamond.address,
    rewardToken: gaxLiquidityTokenReward.address,
    diamondCutFacet: diamondCutFacet.address,
    diamondLoupeFacet: diamondLoupeFacet.address,
    ownershipFacet: ownershipFacet.address,
    farmFacet: farmFacet.address,
    farmInit: farmInit.address,
    reentrancyGuardInit: reentrancyGuardInit.address,
  };
  const latestBlock = await hre.ethers.provider.getBlock("latest");
  const latestBlockNumber = latestBlock.number;
  const farmInitParams = {
    startBlock: 28_471_715,
    decayPeriod: 38000 * 365,
  };
  tx = await farmAndGLTRDeployer
    .connect(owner)
    .deployFarmAndGLTR(deployedAddresses, farmInitParams);

  await tx.wait();

  farmFacet = await hre.ethers.getContractAt("FarmFacet", diamond.address);
  for (let i = 0; i < allocations.length; i++) {
    tx = await farmFacet
      .connect(owner)
      .add(
        allocations[i].points,
        allocations[i].address,
        allocations[i].withUpdate
      );
    await tx.wait();
  }
  ownershipFacet = await ethers.getContractAt(
    "OwnershipFacet",
    diamond.address
  );
  tx = await ownershipFacet
    .connect(owner)
    .transferOwnership("0x94cb5C277FCC64C274Bd30847f0821077B231022");
  await tx.wait();
  console.log("Owner: " + (await ownershipFacet.owner()));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
