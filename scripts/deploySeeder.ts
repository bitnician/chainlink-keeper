/* eslint-disable no-process-exit */
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "./getSigner";

async function main() {
  const signer = await getSigner(hre);

  const Seeder = await hre.ethers.getContractFactory("Seeder");
  const seeder = await Seeder.connect(signer).deploy();

  console.log("seeder deployed to:", seeder.address);
  console.log("npx hardhat verify --network", hre.network.name, seeder.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
