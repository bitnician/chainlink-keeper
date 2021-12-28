/* eslint-disable no-process-exit */
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "./getSigner";
import { addresses } from "./data";

async function main() {
  const signer = await getSigner(hre);
  const { priceAggregator, seeder } = addresses;
  const threshold = 100;

  const Keeper = await hre.ethers.getContractFactory("Keeper");
  const keeper = await Keeper.connect(signer).deploy(
    priceAggregator,
    seeder,
    threshold
  );

  console.log("keeper deployed to:", keeper.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    keeper.address,
    priceAggregator,
    seeder,
    threshold
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
