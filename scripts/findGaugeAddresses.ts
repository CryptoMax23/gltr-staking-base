import { ethers } from "hardhat";

// Interface for CLPool contract
const CLPoolABI = [
  "function gauge() external view returns (address)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://mainnet.base.org"
  );

  // The CL pool addresses from your deployment script
  const clPoolAddresses = [
    "0x56C11053159a24c0731b4b12356BC1f0578FB474", // ghst-usdc CL pool
    // Add other CL pool addresses here if you have them
  ];

  console.log("Finding gauge addresses for CL pools...\n");

  for (const poolAddress of clPoolAddresses) {
    try {
      const pool = new ethers.Contract(poolAddress, CLPoolABI, provider);

      const [gaugeAddress, token0, token1] = await Promise.all([
        pool.gauge(),
        pool.token0(),
        pool.token1(),
      ]);

      console.log(`Pool: ${poolAddress}`);
      console.log(`  Token0: ${token0}`);
      console.log(`  Token1: ${token1}`);
      console.log(`  Gauge: ${gaugeAddress}`);
      console.log(`  Use this gauge address in your farm: ${gaugeAddress}\n`);
    } catch (error) {
      console.log(`Error checking pool ${poolAddress}:`, error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
