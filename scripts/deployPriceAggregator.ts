/* eslint-disable no-process-exit */
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "./getSigner";
import { chainLinkPriceFeed } from "./data";

async function main() {
  const signer = await getSigner(hre);
  const { kovan } = chainLinkPriceFeed;
  const { address } = kovan;

  const PriceAggregator = await hre.ethers.getContractFactory(
    "PriceAggregator"
  );
  const priceAggregator = await PriceAggregator.connect(signer).deploy(address);

  console.log("PriceAggregator deployed to:", priceAggregator.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    priceAggregator.address,
    address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
