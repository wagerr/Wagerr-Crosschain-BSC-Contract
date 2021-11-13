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
    "0x2b1a716446aea5a18c8da81d193ad59b561f3bb2", //("0x511CF9C7F335726200743b2925537d0E614e5db2" <- deployed with pancake router ,)

    deployer
  );
  const bwgr = await ethers.getContractAt(
    "IBEP20",
    "0xfa2dfd4f223535e0780d8e17e43b97d23aab88a9",
    deployer
  );

  const WBNB = await ethers.getContractAt(
    "IBEP20",
    "0xae13d989dac2f0debff460ac112a837c89baa7cd"
  );

  const BUSD = await ethers.getContractAt(
    "IBEP20",
    "0x78867bbeef44f2326bf8ddd1941a4439382ef2a7"
  );

  const bscExchangeRouterTestNet = await ethers.getContractAt(
    "IBSCExchangeRouter",
    "0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1" //0xD99D1c33F9fC3444f8101754aBC46c52416550D1 : pancake router , ( 0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1 : apeswap router)
  );

  //await updateBSCExchangeRouter(deployer, bettingV4);
  //await addLiquidity(user, bscExchangeRouterTestNet, bwgr);
  //await removeLiquidity(user, bscExchangeRouterTestNet, bwgr);
  //await addCoins(deployer, bettingV4);
  //await setFee(deployer, bettingV4);
  await TestBet(user, deployer, bettingV4, bwgr, BUSD);
  //await printBetStat(bettingV4);
  //await TestRefund(user, deployer, bettingV4, bwgr);
  //await TestPayout(user, deployer, bettingV4, bwgr, WBNB);
  /* await testOther(
    user,
    deployer,
    bettingV4,
    bwgr.address,
    WBNB.address,
    bscExchangeRouterTestNet
  );*/
  //await onOffBetting(deployer, bettingV4);
}

async function addLiquidity(user, bscExchangeRouter, bwgr) {
  await bwgr
    .connect(user)
    .approve(bscExchangeRouter.address, ethers.utils.parseEther("2000"));

  await bscExchangeRouter.connect(user).addLiquidityETH(
    bwgr.address,
    ethers.utils.parseEther("2000"),
    0,
    0,
    user.address,
    Math.floor(Date.now() / 1000) + 60, //10 minutes
    { value: ethers.utils.parseEther("2") }
  );
}

async function removeLiquidity(user, bscExchangeRouter, bwgr) {
  await bscExchangeRouter.connect(user).removeLiquidityETH(
    bwgr.address,
    ethers.utils.parseEther("2000"),
    0,
    0,
    user.address,
    Math.floor(Date.now() / 1000) + 60 //10 minutes
  );
}

async function testOther(
  user,
  deployer,
  bettingV4,
  bwgr,
  WBNB,
  bscExchangeRouter
) {
  const amountMinBNBIn = await bettingV4.getAmountInMin(
    WBNB,
    bwgr,
    ethers.utils.parseEther("100")
  );

  console.log("WGR-BNB: ", ethers.utils.formatEther(amountMinBNBIn));

  const amountOutBNBMin = await bscExchangeRouter.getAmountsOut(
    amountMinBNBIn,
    [WBNB, bwgr]
  );

  const fee = await bettingV4.convertFeeToCoin(bwgr);
  console.log("fee :", ethers.utils.formatEther(fee));

  console.log("BNB-WGR: ", ethers.utils.formatEther(amountOutBNBMin[1]));
}

async function onOffBetting(deployer, bettingV4) {
  await bettingV4.connect(deployer).onOff();
}

async function updateBSCExchangeRouter(deployer, bettingV4) {
  await bettingV4
    .connect(deployer)
    .updateBscExchangeRouter("0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1"); //apeswap router : 0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1  //("0xD99D1c33F9fC3444f8101754aBC46c52416550D1" : pancake router)
}

async function addCoins(deployer, bettingV4) {
  await bettingV4
    .connect(deployer)
    .addCoin("BUSD", "0x78867bbeef44f2326bf8ddd1941a4439382ef2a7");
  await bettingV4
    .connect(deployer)
    .addCoin("BNB", "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd");
  await bettingV4
    .connect(deployer)
    .addCoin("WGR", "0xfa2dfd4f223535e0780d8e17e43b97d23aab88a9");
}

async function setFee(deployer, bettingV4) {
  await bettingV4
    .connect(deployer)
    .setFee(ethers.utils.parseEther("0.001009820"));
}
async function TestBet(user, deployer, bettingV4, bwgr, BUSD) {
  /*await bwgr
    .connect(user)
    .approve(bettingV4.address, ethers.utils.parseEther("110"));

  //for (i = 0; i < 10; i++) {
  await bettingV4
    .connect(user)
    .betWithWGR("4201036777010001", ethers.utils.parseEther("105"));
  //}*/
  await bettingV4
    .connect(user)
    .betWithNativeCoin("4201036777010001", {
      value: ethers.utils.parseEther("0.02"),
    });

  /*await BUSD.connect(user).approve(
    bettingV4.address,
    ethers.utils.parseEther("100")
  );
  await bettingV4
    .connect(user)
    .betWithToken("sdfsdfsfsdfsdf", "BUSD", ethers.utils.parseEther("50"));
*/
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

async function TestRefund(user, deployer, bettingV4, bwgr, BUSD) {
  //bnb
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

async function TestPayout(user, deployer, bettingV4, bwgr) {
  //bwgr
  await bettingV4
    .connect(deployer)
    .processPayout(
      138,
      ethers.utils.parseEther("149.59373438"),
      "2be2d2f59653b461b49d03124a0c00bd7aa0beb0d7391cbef1bdbb54db3595ee",
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
