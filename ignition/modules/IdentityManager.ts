const { ethers, upgrades } = require("hardhat");

async function main() {
    const IdentityManager = await ethers.getContractFactory("IdentityManager");
    const identityManager = await upgrades.deployProxy(IdentityManager, [], { initializer: 'initialize' });
    await identityManager.deployed();
    console.log("IdentityManager deployed to:", identityManager.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
