import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { DIDRestrictedERC721, IdentityManager } from "../typechain-types";

import { expect, assert } from "chai";
import { ethers } from "hardhat";

describe("DIDRestrictedERC721", function() {
    
    let token:DIDRestrictedERC721;
    let owner:SignerWithAddress;
    let user1:SignerWithAddress;
    let user2:SignerWithAddress;
    let addrs:SignerWithAddress[];
    
    let identityManager:IdentityManager;

    beforeEach(async function() {
        [owner, user1, user2, ...addrs] = await ethers.getSigners();
        
        const IdentityManager = await ethers.getContractFactory("IdentityManager");
        identityManager = await IdentityManager.deploy();
        await identityManager.getDeployedCode();
        await identityManager.initialize();
        
        await identityManager.registerIdentity(user1.address, user1.address, "did:user1DID");
        await identityManager.registerIdentity(user2.address, user2.address, "did:user2DID");

        const DIDRestrictedERC721 = await ethers.getContractFactory("DIDRestrictedERC721");
        token = await DIDRestrictedERC721.deploy("DID NFT", "DIDNFT", await identityManager.getAddress());
        await token.getDeployedCode();

        // Mint an NFT to user1 for testing
        await token.connect(owner).mint(user1.address, 1);
    });

    it("should allow transfers between registered DIDs", async function() {
        await expect(token.connect(user1).transferFrom(user1.address, user2.address, 1))
            .to.emit(token, 'Transfer')
            .withArgs(user1.address, user2.address, 1);
        
        expect(await token.ownerOf(1)).to.equal(user2.address);
    });

    it("should prevent transfers to non-registered DIDs", async function() {
        const unregisteredUser = ethers.Wallet.createRandom().address;
        await expect(token.connect(user2).transferFrom(user2.address, unregisteredUser, 1))
            .to.be.revertedWithCustomError;
    });

    it("should allow burning by registered DIDs", async function() {
        await expect(token.connect(user1).burn(1))
            .to.emit(token, 'Transfer')
            .withArgs(user1.address, ethers.ZeroAddress, 1);

        await expect(token.ownerOf(1))
            .to.be.revertedWithCustomError;
    });
});