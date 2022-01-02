import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";
import {
  AggregatorV3Mock,
  KeeperMock,
  PriceAggregator,
  SeederMock,
} from "../typechain-types";

describe("Keeper", function () {
  let keeper: KeeperMock,
    priceAggregator: PriceAggregator,
    seeder: SeederMock,
    aggregatorV3: AggregatorV3Mock,
    tokenMarketPrice: BigNumber,
    threshold: BigNumber;

  const tokenAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const tokenDecimals = 18;
  const priceDecimals = 8;
  const interval = BigNumber.from(300); // 5 minutes
  const provider = ethers.provider;
  const adminRole =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  before(async () => {
    tokenMarketPrice = BigNumber.from(500).mul(
      BigNumber.from(10).pow(priceDecimals)
    );
    threshold = BigNumber.from(100); // 0.01

    const AggregatorV3 = await ethers.getContractFactory("AggregatorV3Mock");
    aggregatorV3 = await AggregatorV3.deploy(tokenMarketPrice);

    const Seeder = await ethers.getContractFactory("SeederMock");
    seeder = (await Seeder.deploy()) as SeederMock;

    const PriceAggregator = await ethers.getContractFactory("PriceAggregator");
    priceAggregator = await PriceAggregator.deploy(aggregatorV3.address);
  });

  beforeEach(async () => {
    const Keeper = await ethers.getContractFactory("KeeperMock");
    keeper = await Keeper.deploy(
      seeder.address,
      priceAggregator.address,
      priceDecimals,
      tokenAddress,
      tokenDecimals,
      threshold,
      interval
    );

    // set role for keeper to be able to call seeder
    seeder.setTokenFeeSetterRole(tokenAddress, keeper.address);
  });

  describe("#setThreshold", () => {
    it("should set threshold by admin", async () => {
      const newThreshold = BigNumber.from(200);
      await keeper.setThreshold(newThreshold);

      expect(await keeper.threshold()).to.be.eq(newThreshold);

      // invalid threshold
      await expect(keeper.setThreshold(BigNumber.from(10001))).revertedWith(
        "invalid threshold"
      );

      // non admin
      const nonAdmin = (await ethers.getSigners())[1];
      await expect(
        keeper.connect(nonAdmin).setThreshold(BigNumber.from(0))
      ).revertedWith(
        `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("#setInterval", () => {
    it("should set interval by admin", async () => {
      const newInterval = BigNumber.from(60);
      await keeper.setInterval(newInterval);

      expect(await keeper.interval()).to.be.eq(newInterval);

      // invalid interval
      await expect(keeper.setInterval(0)).revertedWith("invalid interval");

      // non admin
      const nonAdmin = (await ethers.getSigners())[1];
      await expect(
        keeper.connect(nonAdmin).setInterval(BigNumber.from(0))
      ).revertedWith(
        `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("#setSeedPerUsd", () => {
    it("should set seed per usd by admin", async () => {
      const newSeedPerUsd = BigNumber.from(100);
      await keeper.setSeedPerUsd(newSeedPerUsd);

      expect(await keeper.seedPerUsd()).to.be.eq(newSeedPerUsd);

      // invalid interval
      await expect(keeper.setSeedPerUsd(0)).revertedWith(
        "invalid seed per usd"
      );

      // non admin
      const nonAdmin = (await ethers.getSigners())[1];
      await expect(
        keeper.connect(nonAdmin).setSeedPerUsd(BigNumber.from(0))
      ).revertedWith(
        `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("#isThresholdExceeded", () => {
    it("should return true if new price is greater than threshold", async () => {
      // first try to check threshold when lastPrice is 0
      // eslint-disable-next-line no-unused-expressions
      expect(await keeper.isThresholdExceeded(tokenMarketPrice)).to.be.true;

      // check threshold when price is not changed
      await keeper.updateLastPrice(tokenMarketPrice);
      // eslint-disable-next-line no-unused-expressions
      expect(await keeper.isThresholdExceeded(tokenMarketPrice)).to.be.false;

      const divisor = await keeper.divisor();
      const exceededThresholdValue = tokenMarketPrice
        .mul(threshold)
        .div(divisor)
        .add(1);

      // check threshold when price is dumped
      // eslint-disable-next-line no-unused-expressions
      expect(
        await keeper.isThresholdExceeded(
          tokenMarketPrice.sub(exceededThresholdValue)
        )
      ).to.be.true;

      // check threshold when price is pumped
      // eslint-disable-next-line no-unused-expressions
      expect(
        await keeper.isThresholdExceeded(
          tokenMarketPrice.add(exceededThresholdValue)
        )
      ).to.be.true;
    });

    it.only("should return true is threshold is disable", async () => {
      await keeper.setThreshold(0);

      const lastPrice = await keeper.lastPrice();

      // eslint-disable-next-line no-unused-expressions
      expect(await keeper.isThresholdExceeded(lastPrice)).to.be.true;
    });
  });

  describe("#checkUpkeep", () => {
    it("should return true if the time interval is filled and price has moved more than threshold", async () => {
      // first try: both last timestamp and lastPrice are 0
      // eslint-disable-next-line no-unused-expressions
      expect((await keeper.checkUpkeep([])).upkeepNeeded).to.be.true;

      // update last timestamp
      const currentTime = (await provider.getBlock("latest")).timestamp;
      await keeper.updateLastTimeStamp(currentTime);

      // update last price
      const lastPrice = tokenMarketPrice.div(2);
      await keeper.updateLastPrice(lastPrice);

      const nextRound = interval.add(currentTime).add(1);
      await network.provider.send("evm_setNextBlockTimestamp", [
        +nextRound.toString(),
      ]);
      await network.provider.send("evm_mine");

      const { performData, upkeepNeeded } = await keeper.checkUpkeep([]);
      const decodedPrice = new ethers.utils.AbiCoder().decode(
        ["uint256"],
        performData
      );
      // eslint-disable-next-line no-unused-expressions
      expect(upkeepNeeded).to.be.true;
      expect(decodedPrice[0]).to.be.eq(tokenMarketPrice);
    });

    it("should return false if price is not changed", async () => {
      // update last timestamp
      const currentTime = (await provider.getBlock("latest")).timestamp;
      await keeper.updateLastTimeStamp(currentTime);

      // update last price
      await keeper.updateLastPrice(tokenMarketPrice);

      const nextRound = interval.add(currentTime).add(1);
      await network.provider.send("evm_setNextBlockTimestamp", [
        +nextRound.toString(),
      ]);
      await network.provider.send("evm_mine");

      const { upkeepNeeded } = await keeper.checkUpkeep([]);

      // eslint-disable-next-line no-unused-expressions
      expect(upkeepNeeded).to.be.false;
    });

    it("should return false if time interval is not filled", async () => {
      // update last timestamp
      const currentTime = (await provider.getBlock("latest")).timestamp;
      await keeper.updateLastTimeStamp(currentTime);

      // update last price
      const lastPrice = tokenMarketPrice.div(2);
      await keeper.updateLastPrice(lastPrice);

      const { upkeepNeeded } = await keeper.checkUpkeep([]);

      // eslint-disable-next-line no-unused-expressions
      expect(upkeepNeeded).to.be.false;
    });
  });

  describe("#performUpkeep", () => {
    it("should perform upkeep", async () => {
      // set role for keeper to be able to call seeder
      seeder.setTokenFeeSetterRole(tokenAddress, keeper.address);

      const performData = new ethers.utils.AbiCoder().encode(
        ["uint256"],
        [tokenMarketPrice]
      );
      await keeper.performUpkeep(performData);

      const tokenAmount = BigNumber.from(10).pow(tokenDecimals);
      const seedAmount = await seeder.getSeedAmount(tokenAddress, tokenAmount);

      const truncatedSeedAmount = seedAmount.div(BigNumber.from(10).pow(18));
      const truncatedTokenPrice = tokenMarketPrice.div(
        BigNumber.from(10).pow(priceDecimals)
      );

      const seedPerUsd = await keeper.seedPerUsd();
      const divisor = await keeper.divisor();
      const seedPerToken = truncatedTokenPrice.mul(seedPerUsd).div(divisor);

      expect(truncatedSeedAmount).to.be.eq(seedPerToken);
    });
  });

  describe("Tests with hardcoded value", () => {
    it("should perform upkeep", async () => {
      const priceDecimals = [8, 12, 18];
      const tokenDecimals = [18, 8, 12];
      const tokensMarketPrice = priceDecimals.map((dec) =>
        BigNumber.from(1000).mul(BigNumber.from(10).pow(dec))
      );
      const tokensAmount = tokenDecimals.map((dec) =>
        BigNumber.from(10).pow(dec)
      ); // 1 Token

      for (let i = 0; i < tokensMarketPrice.length; i++) {
        await keeper.updateTokenDecimals(tokenDecimals[i]);
        await keeper.updatePriceDecimals(priceDecimals[i]);

        const performData = new ethers.utils.AbiCoder().encode(
          ["uint256"],
          [tokensMarketPrice[i]]
        );
        await keeper.performUpkeep(performData);
        const seedAmount = await seeder.getSeedAmount(
          tokenAddress,
          tokensAmount[i]
        );
        const truncatedSeedAmount = seedAmount.div(BigNumber.from(10).pow(18));
        expect(truncatedSeedAmount).to.be.eq(BigNumber.from(700));
      }
    });
  });
});
