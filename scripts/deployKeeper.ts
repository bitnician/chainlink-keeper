/* eslint-disable no-process-exit */
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "./getSigner";
import { addresses } from "./data";

async function main() {
  const signer = await getSigner(hre);
  const { priceAggregator, seeder } = addresses;

  const tokenAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const tokenDecimals = 18;
  const priceDecimals = 8;
  const threshold = 0;
  const interval = "300"; // 5 minutes

  const Keeper = await hre.ethers.getContractFactory("Keeper");
  const keeper = await Keeper.connect(signer).deploy(
    seeder,
    priceAggregator,
    priceDecimals,
    tokenAddress,
    tokenDecimals,
    threshold,
    interval
  );

  console.log("keeper deployed to:", keeper.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    keeper.address,
    seeder,
    priceAggregator,
    priceDecimals,
    tokenAddress,
    tokenDecimals,
    threshold,
    interval
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
