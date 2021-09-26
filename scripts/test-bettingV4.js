// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

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
  const user = signers[1];

  const bettingV4 = await ethers.getContractAt(
    "BettingV4",
    "0xD4AA2d3668fdD3cC145287378121A5D3a8f98190",
    //"0x8dA6916b89A786F7234860431bA4ba444AA08C9a",
    deployer
  );
  const bwgr = await ethers.getContractAt(
    "IBEP20",
    "0xfa2dfd4f223535e0780d8e17e43b97d23aab88a9",
    deployer
  );

  const WBNB = await ethers.getContractAt(
    "IBEP20",
    "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"
  );
  await updatePancakeRouter;
  deployer, bettingV4;
  await TestBet(user, deployer, bettingV4, bwgr, WBNB);
  //await printBetStat(bettingV4);
  //await TestRefund(user, deployer, bettingV4, bwgr, WBNB);
  //await TestPayout(user, deployer, bettingV4, bwgr, WBNB);
  //await addCoins(deployer, bettingV4);
}

async function onOffBetting(deployer, bettingV4) {
  await bettingV4.connect(deployer).onOff();
}

async function updatePancakeRouter(deployer, bettingV4) {
  await bettingV4
    .connect(deployer)
    .updatePancakeRouter("0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3");
}

async function addCoins(deployer, bettingV4) {
  await bettingV4
    .connect(deployer)
    .addCoin("BNB", "0xae13d989dac2f0debff460ac112a837c89baa7cd");

  await bettingV4
    .connect(deployer)
    .addCoin("BUSD", "0x78867bbeef44f2326bf8ddd1941a4439382ef2a7");
}

async function TestBet(user, deployer, bettingV4, bwgr, WBNB) {
  await bwgr
    .connect(user)
    .approve(bettingV4.address, ethers.utils.parseEther("100"));

  await bettingV4
    .connect(user)
    .doBet("sdfsdfsfsdfsdf", ethers.utils.parseEther("100"));

  //WBNB
  await WBNB.connect(user).approve(
    bettingV4.address,
    ethers.utils.parseEther("0.12")
  );

  await bettingV4
    .connect(user)
    .doBet2("sdfsdfsfsdfsdf", "BNB", ethers.utils.parseEther("0.12"));

  console.log(
    "total Bets:",
    ethers.utils.formatEther(await bettingV4.totalBets("total"))
  );

  console.log(
    "total Bets (WGR):",
    ethers.utils.formatEther(await bettingV4.totalBets("WGR"))
  );
  console.log(
    "total Bets (BNB):",
    ethers.utils.formatEther(await bettingV4.totalBets("BNB"))
  );
}

async function TestRefund(user, deployer, bettingV4, bwgr, WBNB) {
  //wgr
  betIndex = Number(await bettingV4.betIndex());
  console.log(betIndex.toString());
  await bettingV4.connect(deployer).refund(betIndex - 2);

  //wbnb
  betIndex = Number(await bettingV4.betIndex());
  await bettingV4.connect(deployer).refund(betIndex - 1);

  console.log(
    "total Refunds:",
    ethers.utils.formatEther(await bettingV4.totalRefunds("total"))
  );
  console.log(
    "total Refunds (WGR):",
    ethers.utils.formatEther(await bettingV4.totalRefunds("WGR"))
  );
  console.log(
    "total Refunds (BNB):",
    ethers.utils.formatEther(await bettingV4.totalRefunds("BNB"))
  );
}

async function TestPayout(user, deployer, bettingV4, bwgr, WBNB) {
  //bwgr
  betIndex = Number(await bettingV4.betIndex());
  await bettingV4
    .connect(deployer)
    .updateWgrBetTx(betIndex - 2, "sdfsdfsdsgfdvxfgdsfsdfs");
  await bettingV4
    .connect(deployer)
    .processPayout(
      betIndex - 2,
      ethers.utils.parseEther("26"),
      "TX ID: 0000000000xxxxxx",
      "win"
    );

  //wbnb
  betIndex = Number(await bettingV4.betIndex());
  await bettingV4
    .connect(deployer)
    .updateWgrBetTx(betIndex - 1, "sdfsdfsdsgfdvxfgdsfsdfs");
  await bettingV4
    .connect(deployer)
    .processPayout(
      betIndex - 1,
      ethers.utils.parseEther("26"),
      "TX ID: 0000000000xxxxxx",
      "win"
    );

  console.log(
    "total Payout:",
    ethers.utils.formatEther(await bettingV4.totalPayout("total"))
  );
  console.log(
    "total Payout (WGR):",
    ethers.utils.formatEther(await bettingV4.totalPayout("WGR"))
  );

  console.log(
    "total Payout (BNB):",
    ethers.utils.formatEther(await bettingV4.totalPayout("BNB"))
  );
}

async function printBetStat(bettingV4) {
  console.log(
    "total Bets:",
    ethers.utils.formatEther(await bettingV4.totalBets("total"))
  );

  console.log(
    "total Bets (WGR):",
    ethers.utils.formatEther(await bettingV4.totalBets("WGR"))
  );
  console.log(
    "total Bets (BNB):",
    ethers.utils.formatEther(await bettingV4.totalBets("BNB"))
  );

  console.log(
    "total Refunds:",
    ethers.utils.formatEther(await bettingV4.totalRefunds("total"))
  );
  console.log(
    "total Refunds (WGR):",
    ethers.utils.formatEther(await bettingV4.totalRefunds("WGR"))
  );
  console.log(
    "total Refunds (BNB):",
    ethers.utils.formatEther(await bettingV4.totalRefunds("BNB"))
  );

  console.log(
    "total Payout:",
    ethers.utils.formatEther(await bettingV4.totalPayout("total"))
  );
  console.log(
    "total Payout (WGR):",
    ethers.utils.formatEther(await bettingV4.totalPayout("WGR"))
  );

  console.log(
    "total Payout (BNB):",
    ethers.utils.formatEther(await bettingV4.totalPayout("BNB"))
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
