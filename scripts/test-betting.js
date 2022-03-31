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

  const betting = await ethers.getContractAt(
    "Betting",
    "0x5ef0260999de24bd65aF05e706527355267De286", //old: 0xc249F8011EE09f7CAea548e2bB16C20e8A6981DB ,("0x511CF9C7F335726200743b2925537d0E614e5db2" <- deployed with pancake router ,)

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

  const ExchangeRouterTestNet = await ethers.getContractAt(
    "IExchangeRouter",
    "0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1" //0xD99D1c33F9fC3444f8101754aBC46c52416550D1 : pancake router , ( 0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1 : apeswap router)
  );

    //await withdraw(deployer, betting);
  //await updateExchangeRouter(deployer, betting);
  //await addLiquidity(user, ExchangeRouterTestNet, bwgr);
  //await removeLiquidity(user, ExchangeRouterTestNet, bwgr);
  //await addCoins(deployer, betting); //Must add coins first before betting.
  await removeCoins(deployer, betting);
  //await setFee(deployer, betting);
  //await TestBet(user, deployer, betting, bwgr, BUSD);
  //await printBetStat(betting);
  //await TestRefund(user, deployer, betting, bwgr);
  //await TestPayout(user, deployer, betting, bwgr, WBNB);
  /* await testOther(
    user,
    deployer,
    betting,
    bwgr.address,
    WBNB.address,
    ExchangeRouterTestNet
  );*/
  //await onOffBetting(deployer, betting);
}

async function withdraw(deployer, betting) {
  await betting.connect(deployer).withdraw(ethers.utils.parseEther("7000"));
}
async function addLiquidity(user, ExchangeRouter, bwgr) {
  await bwgr
    .connect(user)
    .approve(ExchangeRouter.address, ethers.utils.parseEther("2000"));

  await ExchangeRouter.connect(user).addLiquidityETH(
    bwgr.address,
    ethers.utils.parseEther("2000"),
    0,
    0,
    user.address,
    Math.floor(Date.now() / 1000) + 60, //10 minutes
    { value: ethers.utils.parseEther("2") }
  );
}

async function removeLiquidity(user, ExchangeRouter, bwgr) {
  await ExchangeRouter.connect(user).removeLiquidityETH(
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
  betting,
  bwgr,
  WBNB,
  ExchangeRouter
) {
  const amountMinBNBIn = await betting.getAmountInMin(
    WBNB,
    bwgr,
    ethers.utils.parseEther("100")
  );

  console.log("WGR-BNB: ", ethers.utils.formatEther(amountMinBNBIn));

  const amountOutBNBMin = await ExchangeRouter.getAmountsOut(amountMinBNBIn, [
    WBNB,
    bwgr,
  ]);

  const fee = await betting.convertFeeToCoin(bwgr);
  console.log("fee :", ethers.utils.formatEther(fee));

  console.log("BNB-WGR: ", ethers.utils.formatEther(amountOutBNBMin[1]));
}

async function onOffBetting(deployer, betting) {
  await betting.connect(deployer).onOff();
}

async function updateExchangeRouter(deployer, betting) {
  await betting
    .connect(deployer)
    .updateExchangeRouter("0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1"); //apeswap router : 0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1  //("0xD99D1c33F9fC3444f8101754aBC46c52416550D1" : pancake router)
}

async function addCoins(deployer, betting) {
   /*await betting
    .connect(deployer)
    .addCoin("BUSD", "0x78867bbeef44f2326bf8ddd1941a4439382ef2a7");*/
  /*await betting
    .connect(deployer)
    .addCoin("BNB", "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd");*/
  await betting
    .connect(deployer)
    .addCoin("WGR", "0xfa2dfd4f223535e0780d8e17e43b97d23aab88a9");
}

async function removeCoins(deployer, betting) {
  //await betting.connect(deployer).removeCoin("WGR");
  await betting.connect(deployer).removeCoin("BNB");
}

async function setFee(deployer, betting) {
  await betting
    .connect(deployer)
    .setFee(ethers.utils.parseEther("0.001009820"));
}
async function TestBet(user, deployer, betting, bwgr, BUSD) {
  await bwgr
    .connect(user)
    .approve(betting.address, ethers.utils.parseEther("110"));

  //for (i = 0; i < 10; i++) {
  await betting
    .connect(user)
    .betWithWGR("4201036777010001", ethers.utils.parseEther("105"));
  //}*/
  /*await betting.connect(user).betWithNativeCoin("4201039477010001", {
    value: ethers.utils.parseEther("0.02"),
  });*/

  /*await BUSD.connect(user).approve(
    betting.address,
    ethers.utils.parseEther("100")
  );
  await betting
    .connect(user)
    .betWithToken("sdfsdfsfsdfsdf", "BUSD", ethers.utils.parseEther("50"));
*/
  console.log(
    "total Bets:",
    ethers.utils.formatEther(await betting.totalBets("total"))
  );

  console.log(
    "total Bets (WGR):",
    ethers.utils.formatEther(await betting.totalBets("WGR"))
  );
  console.log(
    "total Bets (BNB):",
    ethers.utils.formatEther(await betting.totalBets("BNB"))
  );
}

async function TestRefund(user, deployer, betting, bwgr, BUSD) {
  //bnb
  betIndex = Number(await betting.betIndex());
  await betting.connect(deployer).refund(betIndex - 1);

  console.log(
    "total Refunds:",
    ethers.utils.formatEther(await betting.totalRefunds("total"))
  );
  console.log(
    "total Refunds (WGR):",
    ethers.utils.formatEther(await betting.totalRefunds("WGR"))
  );
  console.log(
    "total Refunds (BNB):",
    ethers.utils.formatEther(await betting.totalRefunds("BNB"))
  );
}

async function TestPayout(user, deployer, betting, bwgr) {
  //bwgr
  await betting
    .connect(deployer)
    .processPayout(
      138,
      ethers.utils.parseEther("149.59373438"),
      "2be2d2f59653b461b49d03124a0c00bd7aa0beb0d7391cbef1bdbb54db3595ee",
      "win"
    );

  console.log(
    "total Payout:",
    ethers.utils.formatEther(await betting.totalPayout("total"))
  );
  console.log(
    "total Payout (WGR):",
    ethers.utils.formatEther(await betting.totalPayout("WGR"))
  );

  console.log(
    "total Payout (BNB):",
    ethers.utils.formatEther(await betting.totalPayout("BNB"))
  );
}

async function printBetStat(betting) {
  console.log(
    "total Bets:",
    ethers.utils.formatEther(await betting.totalBets("total"))
  );

  console.log(
    "total Bets (WGR):",
    ethers.utils.formatEther(await betting.totalBets("WGR"))
  );
  console.log(
    "total Bets (BNB):",
    ethers.utils.formatEther(await betting.totalBets("BNB"))
  );

  console.log(
    "total Refunds:",
    ethers.utils.formatEther(await betting.totalRefunds("total"))
  );
  console.log(
    "total Refunds (WGR):",
    ethers.utils.formatEther(await betting.totalRefunds("WGR"))
  );
  console.log(
    "total Refunds (BNB):",
    ethers.utils.formatEther(await betting.totalRefunds("BNB"))
  );

  console.log(
    "total Payout:",
    ethers.utils.formatEther(await betting.totalPayout("total"))
  );
  console.log(
    "total Payout (WGR):",
    ethers.utils.formatEther(await betting.totalPayout("WGR"))
  );

  console.log(
    "total Payout (BNB):",
    ethers.utils.formatEther(await betting.totalPayout("BNB"))
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
