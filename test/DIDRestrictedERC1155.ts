import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { DIDRestrictedERC1155, IdentityManager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DIDRestrictedERC1155", function() {
    
    let token:DIDRestrictedERC1155;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    let identityManager:IdentityManager;

    beforeEach(async function() {
        [owner, user1, user2] = await ethers.getSigners();

        const IdentityManager = await ethers.getContractFactory("IdentityManager");
        identityManager = await IdentityManager.deploy();
        await identityManager.getDeployedCode();
        await identityManager.initialize();

        // Registering identities
        await identityManager.registerIdentity(user1.address, user1.address, "user1DID");
        await identityManager.registerIdentity(user2.address, user2.address, "user2DID");

        const DIDRestrictedERC1155 = await ethers.getContractFactory("DIDRestrictedERC1155");
        token = await DIDRestrictedERC1155.deploy("https://token-cdn.com/metadata/{id}.json", await identityManager.getAddress());
        await token.getDeployedCode();
    });

    it("should allow registered DIDs to mint and transfer tokens", async function () {
        const data = ethers.randomBytes(32); // Sample data for minting
        await expect(token.connect(user1).mint(user1.address, 1, 10, data))
            .to.emit(token, 'TransferSingle');

        expect(await token.balanceOf(user1.address, 1)).to.equal(10);

        // Transfer tokens from user1 to user2
        await token.connect(user1).setApprovalForAll(user2.address, true);
        await expect(token.connect(user2).safeTransferFrom(user1.address, user2.address, 1, 5, data))
            .to.emit(token, 'TransferSingle');

        expect(await token.balanceOf(user2.address, 1)).to.equal(5);
    });

    it("should prevent non-registered DIDs from minting or transferring tokens", async function () {
        const unregisteredUser = ethers.Wallet.createRandom().address; // Simulate an unregistered user
        const data = ethers.randomBytes(32);
        await expect(token.mint(unregisteredUser, 1, 10, data))
            .to.be.revertedWith("Minter is not a registered DID");

        // Attempt to transfer tokens by an unregistered user
        await expect(token.connect(user1).safeTransferFrom(user1.address, unregisteredUser, 1, 5, data))
            .to.be.revertedWithCustomError;
    });

    it("should allow burning by registered DIDs", async function() {
        const data = ethers.randomBytes(32);
        await token.connect(user1).mint(user1.address, 1, 10, data);

        await expect(token.connect(user1).burn(user1.address, 1, 5))
            .to.emit(token, 'TransferSingle');

        expect(await token.balanceOf(user1.address, 1)).to.equal(5);
    });
});
