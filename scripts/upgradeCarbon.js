// scripts/upgrade_box.js
const { ethers, upgrades } = require("hardhat");

const PROXY = "0x9A9D11dE6203AdB41ec5353D73F00c5A367D65ca";

async function main() {
    const contractNew = await ethers.getContractFactory("BabyBallerWhalesV6");
    console.log("Upgrading contract...");
    await upgrades.upgradeProxy(PROXY, contractNew);
    console.log("Contract upgraded");    
}

main();
