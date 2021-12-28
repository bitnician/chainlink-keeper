import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";
import {
  AggregatorV3Mock,
  Keeper,
  PriceAggregator,
  Seeder,
} from "../typechain-types";

describe("Keeper", function () {
  let keeper: Keeper,
    priceAggregator: PriceAggregator,
    seeder: Seeder,
    aggregatorV3: AggregatorV3Mock,
    tokenPrice: BigNumber;

  const nativeAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const nativeDecimalMultiplier = 1e8;
  const provider = ethers.provider;

  before(async () => {
    tokenPrice = BigNumber.from(500).mul(nativeDecimalMultiplier);

    const AggregatorV3 = await ethers.getContractFactory("AggregatorV3Mock");
    aggregatorV3 = await AggregatorV3.deploy(tokenPrice);

    const Seeder = await ethers.getContractFactory("Seeder");
    seeder = await Seeder.deploy();

    const PriceAggregator = await ethers.getContractFactory("PriceAggregator");
    priceAggregator = await PriceAggregator.deploy(aggregatorV3.address);

    const Keeper = await ethers.getContractFactory("Keeper");
    keeper = await Keeper.deploy(priceAggregator.address, seeder.address, 100);
  });

  it("expects keeper to update the seeder", async function () {
    const { price } = await aggregatorV3.latestRoundData();
    const lastPrice = await keeper.lastPrice();
    expect(price).to.be.eq(tokenPrice);
    expect(lastPrice).to.be.eq(tokenPrice);

    // now aggregatorV3 will emit new price tha exceed the threshold
    const newTokenPrice = BigNumber.from(600).mul(nativeDecimalMultiplier);
    await aggregatorV3.updatePrice(newTokenPrice);

    // next interval
    const interval = await keeper.interval();

    const nextRound = interval
      .add((await provider.getBlock("latest")).timestamp)
      .add(1);
    await network.provider.send("evm_setNextBlockTimestamp", [
      +nextRound.toString(),
    ]);
    await network.provider.send("evm_mine");

    const { performData, upkeepNeeded } = await keeper.checkUpkeep([]);
    // eslint-disable-next-line no-unused-expressions
    expect(upkeepNeeded).to.be.true;

    await keeper.performUpkeep(performData);

    const seedPrice = await seeder.getSeedAmount(nativeAddress, 1e8);
    expect(seedPrice.div(BigNumber.from(10).pow(18))).to.be.eq(
      newTokenPrice.div(nativeDecimalMultiplier)
    );
  });
});
