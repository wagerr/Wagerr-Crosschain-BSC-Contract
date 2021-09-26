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
    const betting = await upgrades.deployProxy(Betting, [token.address], {
      kind: "uups",
    });
    await betting.deployed();

    console.log("betting contract deployed At:", betting.address);
  } else if (network == "testnet") {
    const Betting = await ethers.getContractFactory("BettingV4");
    const betting = await upgrades.deployProxy(
      Betting,
      ["0xfa2dfd4f223535e0780d8e17e43b97d23aab88a9"],
      {
        kind: "uups",
      }
    );
    await betting.deployed();

    console.log("betting contract deployed At:", betting.address);
  }
};
module.exports.tags = ["Deploy"];
