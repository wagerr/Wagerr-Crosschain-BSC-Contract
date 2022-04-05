const { assert } = require("chai");

module.exports = async (hre) => {
  const { upgrades, ethers } = hre;

  const network = hre.network.name;

  if (["hardhat", "ganache", "localhost"].includes(network)) {
    const Token = await ethers.getContractFactory("BEP20Token");
    const token = await Token.deploy();
    await token.deployed();

    console.log("token Deployed At:", token.address);

    const Betting = await ethers.getContractFactory("Betting");
    const betting = await upgrades.deployProxy(
      Betting,
      [
        token.address,
        "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
        "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
      ],
      {
        kind: "uups",
      }
    );
    await betting.deployed();

    console.log("betting contract deployed At:", betting.address);
  } else if (network == "testnet") {
    const Betting = await ethers.getContractFactory("Betting");
    const betting = await upgrades.deployProxy(
      Betting,
      [
        "0xfa2dfd4f223535e0780d8e17e43b97d23aab88a9", //BWGR
        "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", //WBNB
        "0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1", //apeswap router testnet , ("0xD99D1c33F9fC3444f8101754aBC46c52416550D1" <- //PancakeRouter)
      ],
      {
        kind: "uups",
      }
    );
    await betting.deployed();

    console.log("betting contract deployed At:", betting.address);
  } else if (network == "mainnet") {
    const Betting = await ethers.getContractFactory("Betting");
    const betting = await upgrades.deployProxy(
      Betting,
      [
        "0xdBf8265B1d5244A13424f13977723AcF5395eAB2", //BWGR
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", //WBNB
        "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7", //apeswap router mainnet
      ],
      {
        kind: "uups",
      }
    );
    await betting.deployed();

    console.log("betting contract deployed At:", betting.address);
  }
};
module.exports.tags = ["Deploy"];
