import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, use } from "chai";
import hre from "hardhat";

import { upgrades } from "hardhat";

describe("UUPSToken", function () {
    let dao: hre.ethers.Contract;
    let token: hre.ethers.Contract;
    let owner: hre.ethers.Signer, addr1: hre.ethers.Signer;
    
    beforeEach(async function () {
        [owner, addr1] = await hre.ethers.getSigners();
        const DAO = await hre.ethers.getContractFactory("DAO");
        dao = await DAO.deploy();
        await dao.getDeployedCode();
        
        const Token = await hre.ethers.getContractFactory("UUPSToken");
        // token = await upgrades.deployProxy(Token, ["MyToken", "MTK", await dao.getAddress()], { initializer: 'initialize' });
        token = await upgrades.deployProxy(Token, ["MyToken", "MTK", hre.ethers.parseUnits("1000000", 18), owner.address, await dao.getAddress()], { initializer: 'initialize' });
    });

    it("should assign the total supply of tokens to the owner", async function () {
        const ownerBalance = await token.balanceOf(owner.address);
        expect(await token.totalSupply()).to.be.greaterThan(0);
        expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it("transfers tokens between accounts", async function () {
        const ownerBalance = await token.balanceOf(owner.address);
        // Transfer 50 tokens from owner to addr1
        await token.connect(owner).transfer(addr1.address, 50);
        expect(await token.balanceOf(addr1.address)).to.equal(50);
        const remainder = ownerBalance - hre.ethers.toBigInt(50);
        expect(await token.balanceOf(owner.address)).to.equal(remainder);
    });

    it("upgrades the token contract and accesses new functionality", async function () {
        const TokenV2 = await hre.ethers.getContractFactory("UUPSTokenV2");
        const proposalId = hre.ethers.toBigInt(1);
        // governance should have approved the proposal id
        await token.proposeUpgrade(proposalId);

        const upgradedToken = await upgrades.upgradeProxy(await token.getAddress(), TokenV2);
    
        // Access new function in V2
        expect(await upgradedToken.newFunction()).to.equal("New functionality!");
    });
});
