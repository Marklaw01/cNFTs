const { ethers } = require("hardhat");

async function main() {
    // We get the contract to deploy
    const contract = await ethers.getContractFactory("BabyBallerWhalesV3");
    const contractAddress = await contract.deploy();
    await contractAddress.deployed();
    console.log("Contract deployed to:", contractAddress.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });