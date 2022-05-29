// scripts/deploy_upgradeable_box.js
const { ethers, upgrades } = require("hardhat");

async function main() {
    const contract = await ethers.getContractFactory("BallerWhalesV1");
    console.log("Deploying contract...");
    const instance = await upgrades.deployProxy(contract, ["ipfs://bafybeidh452aqohfilpsoclhxnibojwyj2oxz77wxky6jv55zlvigfjlqq/json/", "0xF43aD099EbB3f9e2ed7B60d72eEd59965Cbc27E5"], {
        initializer: "initialize",
    });
    await instance.deployed();
    console.log("Contract deployed to:", instance.address);
}

main()
.then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
