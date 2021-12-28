/* eslint-disable no-process-exit */
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "./getSigner";
import { addresses } from "./data";

async function main() {
  const signer = await getSigner(hre);
  const { chainLinkPriceFeed } = addresses;

  const PriceAggregator = await hre.ethers.getContractFactory(
    "PriceAggregator"
  );
  const priceAggregator = await PriceAggregator.connect(signer).deploy(
    chainLinkPriceFeed
  );

  console.log("PriceAggregator deployed to:", priceAggregator.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    priceAggregator.address,
    chainLinkPriceFeed
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
