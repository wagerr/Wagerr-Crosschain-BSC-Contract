// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const { assert } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  //await hre.run("compile");

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  const bettingV4 = await ethers.getContractAt(
    "BettingV4",
    "0x511CF9C7F335726200743b2925537d0E614e5db2", //old -> "0xD4AA2d3668fdD3cC145287378121A5D3a8f98190",
    deployer
  );

  console.log(await bettingV4.version());
  assert((await bettingV4.version()) === "v4");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
