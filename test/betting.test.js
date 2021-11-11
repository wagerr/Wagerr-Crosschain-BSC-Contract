const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
describe("Betting", () => {
  let token, betting, deployer, user;
  before(async () => {
    [deployer, user] = await ethers.getSigners();
    token = await ethers.getContractFactory("BEP20Token");
    token = await token.deploy();
    Betting = await ethers.getContractFactory("BettingV4");
    betting = await upgrades.deployProxy(
      Betting,
      [token.address] /*{deployer.address:deployer.address}*/
    ); //dont need deployer.address in ganache
    const BettingV4 = await ethers.getContractFactory("BettingV4");
    betting = await upgrades.upgradeProxy(betting, BettingV4);
    console.log(token.address, betting.address);
  });
  beforeEach(async () => {
    await token
      .connect(deployer)
      .transfer(user.address, ethers.utils.parseEther("100"));
    console.log("transfer success");
    console.log("contract address:", betting.address);

    await token
      .connect(user)
      .approve(betting.address, ethers.utils.parseEther("25"));
    console.log("approved token for ", betting.address);
    await betting
      .connect(user)
      .betWithWGR("ABCD1234564543", ethers.utils.parseEther("25"));
  });

  /*describe("testing token contract...", () => {
    describe("success", () => {
      it("checking token name", async () => {
        expect(await token.name()).to.be.eq("Wagerr");
      });

      it("checking token symbol", async () => {
        expect(await token.symbol()).to.be.eq("WGR");
      });

      it("checking token initial total supply", async () => {
        expect(Number(await token.totalSupply())).to.eq(
          200000000000000000000000000
        );
      });
    });
  });*/

  describe("testing Betting contract...", () => {
    describe("success", async () => {
      it("check totalBets increased", async () => {
        const totalBets = Number(
          ethers.utils.formatEther(await betting.totalBets())
        );

        expect(totalBets).to.equal(25);
      });
      it("check user has balance", async () => {
        expect(Number(await token.balanceOf(user.address))).to.gt(25);
      });

      it("check betIndex increased", async () => {
        const betIndex = Number(await betting.betIndex());
        expect(betIndex).to.gte(2);
      });

      it("check record saved", async () => {
        const betIndex = Number(await betting.betIndex());
        let bet = await betting.Bets(betIndex - 1);
        expect(bet.opcode).to.be.eq("ABCD1234564543");
        expect(Number(ethers.utils.formatEther(bet.amount))).to.eq(25);
      });

      it("refund", async () => {
        const userBalance = Number(await token.balanceOf(user.address));
        const betIndex = Number(await betting.betIndex());
        await betting.connect(deployer).refund(betIndex - 1);
        const userBalance2 = Number(await token.balanceOf(user.address));
        expect(userBalance2).to.gt(userBalance);
      });

      it("check totalRefund increased", async () => {
        const totalRefund = Number(
          ethers.utils.formatEther(await betting.totalRefunds())
        );

        expect(totalRefund).to.equal(25);
      });

      it("update BetTxID", async () => {
        const betIndex = Number(await betting.betIndex());
        await betting
          .connect(deployer)
          .updateWgrBetTx(
            betIndex - 1,
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
          );
        let bet = await betting.Bets(betIndex - 1);
        expect(bet.wgrBetTx).to.be.equal(
          "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
        );
      });

      it("test payout", async () => {
        const betIndex = Number(await betting.betIndex());
        console.log(betIndex - 1);
        await betting.connect(deployer).processPayout(
          betIndex - 2, //before each doing new bet, we want to payout previous bet.
          ethers.utils.parseEther("25"),
          "4f16b35f73c5f6aabe3f77a05d05fb7107474c5759e6c07b80d777889995452a",
          "win"
        );

        let bet = await betting.Bets(betIndex - 2);
        expect(bet.payoutTxId).to.be.equal(
          "4f16b35f73c5f6aabe3f77a05d05fb7107474c5759e6c07b80d777889995452a"
        );
      });

      it("check totalPayout increased", async () => {
        const totalPayout = Number(
          ethers.utils.formatEther(await betting.totalPayout())
        );

        expect(totalPayout).to.equal(25);
      });

      it("check version", async () => {
        const version = await betting.version();

        expect(version).to.be.equal("v3");
      });

      it("test withdraw token by owner", async () => {
        const contractBalanceBefore = Number(
          ethers.utils.formatEther(await token.balanceOf(betting.address))
        );
        await betting.connect(deployer).withdraw(ethers.utils.parseEther("25"));
        const contractBalanceAfter = Number(
          ethers.utils.formatEther(await token.balanceOf(betting.address))
        );

        expect(contractBalanceBefore).to.equal(contractBalanceAfter + 25);
      });
    });
  });

  describe("failure", () => {
    it("bet should be rejected - 'minimum bet 25 BWGR' ", async () => {
      await token
        .connect(user)
        .approve(betting.address, ethers.utils.parseEther("0.5"));
      await expect(
        betting
          .connect(user)
          .betWithWGR("ABCD1234564543", ethers.utils.parseEther("0.5"))
      ).to.be.revertedWith("minimum bet 25 BWGR");
    });

    it("bet should be rejected - 'invalid opcode' ", async () => {
      await token
        .connect(user)
        .approve(betting.address, ethers.utils.parseEther("1"));
      await expect(
        betting.connect(user).betWithWGR("", ethers.utils.parseEther("25"))
      ).to.be.revertedWith("invalid opcode");
    });

    it("refund should be rejected - 'only owner' ", async () => {
      let betIndex = Number(await betting.betIndex());
      await expect(
        betting.connect(user).refund(betIndex - 1)
      ).to.be.revertedWith("revert Ownable: caller is not the owner");
    });

    it("refund should be rejected - 'invalid betIndex' ", async () => {
      let betIndex = Number(await betting.betIndex());
      await expect(
        betting.connect(deployer).refund(betIndex)
      ).to.be.revertedWith("invalid betIndex");
    });

    it("refund should be rejected - 'bet already processed' ", async () => {
      let betIndex = Number(await betting.betIndex());
      //refund
      await betting.connect(deployer).refund(betIndex - 1);
      await expect(
        betting.connect(deployer).refund(betIndex - 1)
      ).to.be.revertedWith("bet already processed");
    });

    it("update BetTxId should be rejected - 'only owner' ", async () => {
      let betIndex = Number(await betting.betIndex());
      await expect(
        betting
          .connect(user)
          .updateWgrBetTx(
            betIndex - 1,
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
          )
      ).to.be.revertedWith("revert Ownable: caller is not the owner");
    });

    it("update BetTxId should be rejected - 'invalid betIndex' ", async () => {
      let betIndex = Number(await betting.betIndex());
      await expect(
        betting
          .connect(deployer)
          .updateWgrBetTx(
            betIndex,
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
          )
      ).to.be.revertedWith("invalid betIndex");
    });

    it("update BetTxId should be rejected - 'txId cannot be empty' ", async () => {
      let betIndex = Number(await betting.betIndex());
      await expect(
        betting.connect(deployer).updateWgrBetTx(betIndex - 1, "")
      ).to.be.revertedWith("txId cannot be empty");
    });
    it("update BetTxId should be rejected - 'betTxId already updated' ", async () => {
      let betIndex = Number(await betting.betIndex());

      //update betTxId
      await betting
        .connect(deployer)
        .updateWgrBetTx(
          betIndex - 1,
          "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
        );

      await expect(
        betting
          .connect(deployer)
          .updateWgrBetTx(
            betIndex - 1,
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
          )
      ).to.be.revertedWith("wgrBetTx already updated");
    });

    it("processPayout should be rejected - 'only owner' ", async () => {
      let betIndex = Number(await betting.betIndex());
      await expect(
        betting
          .connect(user)
          .processPayout(
            betIndex - 1,
            ethers.utils.parseEther("25"),
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79",
            "win"
          )
      ).to.be.revertedWith("revert Ownable: caller is not the owner");
    });

    it("processPayout should be rejected - 'bet not processed yet or refunded' ", async () => {
      let betIndex = Number(await betting.betIndex());

      await expect(
        betting
          .connect(deployer)
          .processPayout(
            betIndex - 1,
            ethers.utils.parseEther("25"),
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79",
            "win"
          )
      ).to.be.revertedWith("bet not processed yet or refunded");
    });

    it("processPayout should be rejected - 'invalid betIndex' ", async () => {
      let betIndex = Number(await betting.betIndex());

      await expect(
        betting
          .connect(deployer)
          .processPayout(
            betIndex,
            ethers.utils.parseEther("25"),
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79",
            "win"
          )
      ).to.be.revertedWith("invalid betIndex");
    });

    it("processPayout should be rejected - 'payoutTxId cannot be empty' ", async () => {
      let betIndex = Number(await betting.betIndex());

      //we need to process bet to go to next checkpoint
      await betting
        .connect(deployer)
        .updateWgrBetTx(
          betIndex - 1,
          "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
        );

      await expect(
        betting
          .connect(deployer)
          .processPayout(betIndex - 1, ethers.utils.parseEther("25"), "", "win")
      ).to.be.revertedWith("payoutTxId cannot be empty");
    });

    it("processPayout should be rejected - 'payout amount required' ", async () => {
      let betIndex = Number(await betting.betIndex());

      //we need to process bet to go to next checkpoint
      await betting
        .connect(deployer)
        .updateWgrBetTx(
          betIndex - 1,
          "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
        );

      await expect(
        betting
          .connect(deployer)
          .processPayout(
            betIndex - 1,
            ethers.utils.parseEther("0"),
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79",
            "win"
          )
      ).to.be.revertedWith("payout amount required");
    });

    it("processPayout should be rejected - 'result Type required' ", async () => {
      let betIndex = Number(await betting.betIndex());

      //we need to process bet to go to next checkpoint
      await betting
        .connect(deployer)
        .updateWgrBetTx(
          betIndex - 1,
          "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79"
        );

      await expect(
        betting
          .connect(deployer)
          .processPayout(
            betIndex - 1,
            ethers.utils.parseEther("0"),
            "7ff351e35688c5a6171dfe75da1f21b1fed5dfac42a230b7ada68001cde17b79",
            ""
          )
      ).to.be.revertedWith("resultType cannot be empty");
    });

    it("withdraw should be rejected - 'only owner' ", async () => {
      await expect(
        betting.connect(user).withdraw(ethers.utils.parseEther("25"))
      ).to.be.revertedWith("revert Ownable: caller is not the owner");
    });
  });
});
