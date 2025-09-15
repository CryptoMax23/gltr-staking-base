import { ethers } from "hardhat";
import { BigNumber, Signer, Contract, Wallet } from "ethers";

import { getLedgerSigner, getRelayerSigner } from "./helperFunctions";
import { PC_WALLET, varsForNetwork } from "./constants";

interface Allocation {
  points: BigNumber;
  address: String;
}

async function main() {
  let tx;
  const allocations: Allocation[] = [
    {
      points: BigNumber.from(2),
      address: "0xeae2fB93e291C2eB69195851813DE24f97f1ce71", // ghst-fud
    },
    {
      points: BigNumber.from(2),
      address: "0x62ab7d558A011237F8a57ac0F97601A764e85b88", // ghst-fomo
    },
    {
      points: BigNumber.from(2),
      address: "0x0Ba2A49aedf9A409DBB0272db7CDF98aEb1E1837", // ghst-alpha
    },
    {
      points: BigNumber.from(2),
      address: "0x699B4eb36b95cDF62c74f6322AaA140E7958Dc9f", // ghst-kek
    },
    // CL pools are not compatible with ERC20-based farms
    // {
    //   points: BigNumber.from(4),
    //   address: "0x8cA6075D8109bBb56d4af4B1056D2ba946c8086B", // ghst-usdc gauge (CL pool) - INCOMPATIBLE
    // },
    {
      points: BigNumber.from(4),
      address: "0x0DFb9Cb66A18468850d6216fCc691aa20ad1e091", // ghst-weth
    },
    {
      points: BigNumber.from(2),
      address: "0xa83b31D701633b8EdCfba55B93dDBC202D8A4621", // ghst-gltr
    },

    //total points: 16
  ];

  //@ts-ignore
  const owner = await getRelayerSigner(hre);
  //deploy with relayer

  const { gltrAddress } = await varsForNetwork(ethers);

  const DiamondCutFacet = await ethers.getContractFactory(
    "DiamondCutFacet",
    owner
  );
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();
  console.log("DiamondCutFacet: " + diamondCutFacet.address);
  const DiamondLoupeFacet = await ethers.getContractFactory(
    "DiamondLoupeFacet",
    owner
  );
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.deployed();
  console.log("DiamondLoupeFacet: " + diamondLoupeFacet.address);

  const OwnershipFacet = await ethers.getContractFactory(
    "OwnershipFacet",
    owner
  );
  let ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.deployed();
  console.log("OwnershipFacet: " + ownershipFacet.address);

  const FarmFacet = await ethers.getContractFactory("FarmFacet", owner);
  let farmFacet = await FarmFacet.deploy();
  await farmFacet.deployed();
  console.log("FarmFacet: " + farmFacet.address);

  const FarmInit = await ethers.getContractFactory("FarmInit", owner);
  const farmInit = await FarmInit.deploy();
  await farmInit.deployed();
  console.log("FarmInit: " + farmInit.address);

  const ReentrancyGuardInit = await ethers.getContractFactory(
    "ReentrancyGuardInit",
    owner
  );
  const reentrancyGuardInit = await ReentrancyGuardInit.deploy();
  await reentrancyGuardInit.deployed();
  console.log("ReentrancyGuardInit: " + reentrancyGuardInit.address);

  const FarmAndGLTRDeployer = await ethers.getContractFactory(
    "FarmAndGLTRDeployer",
    owner
  );
  const farmAndGLTRDeployer = await FarmAndGLTRDeployer.deploy();
  await farmAndGLTRDeployer.deployed();
  console.log("FarmAndGLTRDeployer: " + farmAndGLTRDeployer.address);

  const Diamond = await ethers.getContractFactory("Diamond", owner);
  const diamond = await Diamond.deploy(
    farmAndGLTRDeployer.address,
    diamondCutFacet.address
  );
  await diamond.deployed();
  console.log("Diamond: " + diamond.address);

  //use ledger for gltr transfer
  // const ledgerSigner = await getLedgerSigner(ethers);
  // const gltr = await ethers.getContractAt(
  //   "GAXLiquidityTokenReward",
  //   gltrAddress,
  //   ledgerSigner
  // );

  // //transfer all bridged gltr to the contract
  // tx = await gltr.transfer(
  //   diamond.address,
  //   //should be approx 719,830,253,819 GLTR
  //   await gltr.balanceOf(await ledgerSigner.getAddress())
  // );
  // await tx.wait();
  // console.log("GAXLiquidityTokenReward transferred to Diamond");

  const deployedAddresses = {
    diamond: diamond.address,
    rewardToken: gltrAddress,
    diamondCutFacet: diamondCutFacet.address,
    diamondLoupeFacet: diamondLoupeFacet.address,
    ownershipFacet: ownershipFacet.address,
    farmFacet: farmFacet.address,
    farmInit: farmInit.address,
    reentrancyGuardInit: reentrancyGuardInit.address,
  };

  const farmInitParams = {
    startBlock: 35_515_184, //TO-DO: update to a latter block on base
    decayPeriod: 43300 * 365, //2 second blocktime for base
  };

  console.log("Deploying FarmAndGLTR...");

  tx = await farmAndGLTRDeployer.deployFarmAndGLTR(
    deployedAddresses,
    farmInitParams
  );

  await tx.wait();

  farmFacet = await ethers.getContractAt("FarmFacet", diamond.address);

  // Prepare arrays for batch add
  const allocPoints = allocations.map((allocation) => allocation.points);
  const lpTokenAddresses = allocations.map((allocation) => allocation.address);

  // Add all pools in a single transaction
  tx = await farmFacet.connect(owner).batchAdd(allocPoints, lpTokenAddresses);
  await tx.wait();
  console.log(`Added ${allocations.length} farms in a single transaction`);
  ownershipFacet = await ethers.getContractAt(
    "OwnershipFacet",
    diamond.address,
    owner
  );

  console.log("Transferring ownership from relayer to PC_WALLET...");
  //transfer ownership from relayer to ledger signer
  tx = await ownershipFacet.transferOwnership(PC_WALLET);
  await tx.wait();
  console.log("Owner: " + (await ownershipFacet.owner()));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
