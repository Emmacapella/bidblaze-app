const hre = require("hardhat");

async function main() {
  const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; 
  console.log("Deploying BidBlaze...");
  const bidBlaze = await hre.ethers.deployContract("BidBlaze", [BASE_USDC]);
  await bidBlaze.waitForDeployment();
  console.log("------------------------------------------");
  console.log("BidBlaze successfully deployed to Base!");
  console.log("Contract Address:", bidBlaze.target);
  console.log("------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
