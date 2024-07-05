import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { DIDRestrictedERC20 } from "../typechain-types";

describe("DIDRestrictedERC20", function () {

    let token:DIDRestrictedERC20;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    let identityManager;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy IdentityManager mock or actual contract as needed
        const IdentityManager = await ethers.getContractFactory("IdentityManager");
        identityManager = await IdentityManager.deploy();
        await identityManager.getDeployedCode();
        await identityManager.initialize();
        
        // Assume user1 and user2 are registered
        await identityManager.registerIdentity(user1.address, user1.address, "user1DID");
        await identityManager.registerIdentity(user2.address, user2.address, "user2DID");

        const DIDRestrictedERC20 = await ethers.getContractFactory("DIDRestrictedERC20");
        token = await DIDRestrictedERC20.deploy("DID Token", "DIDT", await identityManager.getAddress());
        await token.getDeployedCode();

        // Mint tokens for testing
        await identityManager.registerIdentity(owner.address, owner.address, "ownerDID");
        await token.mint(owner.address, ethers.parseEther("100"));
        await token.transfer(user1.address, ethers.parseEther("10"));
    });

    it("should allow transfers between registered DIDs", async function () {
        await token.connect(owner).transfer(user1.address, ethers.parseEther("10"));
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("20"));

        // User1 transfers to User2
        await token.connect(user1).transfer(user2.address, ethers.parseEther("5"));
        expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("5"));
    });

    it("should prevent transfers to non-registered DIDs", async function () {
        const unregisteredUser = user2.address; // Simulate user2 not registered
        await expect(token.connect(user2).transfer(unregisteredUser, ethers.parseEther("1")))
            .to.be.reverted;
    });

    it("should allow burning by registered DIDs", async function () {
        // Assuming user1 now has 10 tokens
        await expect(token.connect(user1).burn(ethers.parseEther("5")))
            .to.emit(token, 'Transfer') // Burn emits a Transfer event to address(0)
            .withArgs(user1.address, ethers.ZeroAddress, ethers.parseEther("5"));

        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("5"));
    });

    it("should prevent unregistered DIDs from burning tokens", async function () {
        await expect(token.connect(user2).burnFrom(user1.address, ethers.parseEther("1")))
            .to.be.reverted;
    });
});