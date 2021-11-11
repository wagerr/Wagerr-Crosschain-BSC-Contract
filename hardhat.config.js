require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-deploy");
require("dotenv").config();
const privateKeys = process.env.PRIVATE_KEYS || "";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "localhost",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      gas: 5000000,
      gasPrice: 30000000000,
      timeout: 2000,
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: privateKeys.split(","),
      chainId: 97,
      gas: 5000000,
      gasPrice: 10000000000,
      timeout: 2000,
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      accounts: privateKeys.split(","),
      chainId: 56,
      gas: 5000000,
      gasPrice: 5000000000, // 5 gwei,
      timeout: 2000,
    },
  },
  solidity: {
    version: "0.8.3",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
