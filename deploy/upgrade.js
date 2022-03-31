const { assert } = require("chai");

module.exports = async (hre) => {
  const { upgrades, ethers } = hre;

  const Betting = await ethers.getContractFactory("Betting");
  const bettingOld = await Betting.attach(
    "0x5ef0260999de24bd65aF05e706527355267De286" ///old -> "0xc249F8011EE09f7CAea548e2bB16C20e8A6981DB"
  );

  const bettingNew = await ethers.getContractFactory("Betting");
   const bettingUpgrade = await upgrades.upgradeProxy(bettingOld, bettingNew);

  assert((await bettingUpgrade.version()) === "v5");

  console.log("Betting v5 address:", bettingUpgrade.address);
};
module.exports.tags = ["Upgrade"];
