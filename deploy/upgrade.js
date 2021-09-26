const { assert } = require("chai");

module.exports = async (hre) => {
  const { upgrades, ethers } = hre;

  const Betting = await ethers.getContractFactory("BettingV4");
  const betting = await Betting.attach(
    "0xD4AA2d3668fdD3cC145287378121A5D3a8f98190"
    //"0x8da6916b89a786f7234860431ba4ba444aa08c9a" //proxy contract address
  );

  const BettingV4 = await ethers.getContractFactory("BettingV4");
  const bettingV4 = await upgrades.upgradeProxy(betting, BettingV4);

  assert((await bettingV4.version()) === "v4");

  console.log("Betting v4 address:", bettingV4.address);
};
module.exports.tags = ["Upgrade"];
