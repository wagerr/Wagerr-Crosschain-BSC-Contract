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

  const betting = await ethers.getContractAt(
    "Betting",
    "0x5ef0260999de24bd65aF05e706527355267De286", //old -> "0xc249F8011EE09f7CAea548e2bB16C20e8A6981DB", 0x511CF9C7F335726200743b2925537d0E614e5db2 <- pancakeswap
    deployer
  );

  console.log(await betting.version());
  assert((await betting.version()) === "v5");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
