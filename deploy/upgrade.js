const { assert } = require("chai");

module.exports = async (hre) => {
  const { upgrades, ethers } = hre;

  const Betting = await ethers.getContractFactory("BettingV4");
  const betting = await Betting.attach(
    "0x2b1a716446aea5a18c8da81d193ad59b561f3bb2" ///old -> "0xD4AA2d3668fdD3cC145287378121A5D3a8f98190"
  );

  const BettingV4 = await ethers.getContractFactory("BettingV4");
  const bettingV4 = await upgrades.upgradeProxy(betting, BettingV4);

  assert((await bettingV4.version()) === "v4");

  console.log("Betting v4 address:", bettingV4.address);
};
module.exports.tags = ["Upgrade"];
