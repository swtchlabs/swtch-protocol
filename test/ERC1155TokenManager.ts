import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { IdentityManager, ERC1155TokenManager, ERC1155TokenManager__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC1155TokenManager", function() {
    let tokenManager: ERC1155TokenManager;
    let identityManager: IdentityManager;
    let owner: SignerWithAddress; 
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let unauthorized: SignerWithAddress;

    before(async function() {
        [owner, user1, user2, unauthorized] = await ethers.getSigners();

        const IdentityManager = await ethers.getContractFactory("IdentityManager");
        identityManager = await IdentityManager.deploy();
        await identityManager.getDeployedCode();
        await identityManager.initialize();

        await identityManager.registerIdentity(user1.address, user1.address, "did:user1DID");
        await identityManager.registerIdentity(user2.address, user2.address, "did:user2DID");

        const ERC1155TokenManager = await ethers.getContractFactory("ERC1155TokenManager") as ERC1155TokenManager__factory;
        tokenManager = await ERC1155TokenManager.deploy();
        await tokenManager.getDeployedCode();
        await tokenManager.initialize(await identityManager.getAddress());
    });

    describe("Token Deployment", function() {
        it("should allow a registered DID to deploy an ERC1155 token", async function() {
            const uri = "https://myapi.com/metadata/{id}.json";
            await expect(tokenManager.connect(user1).deployDIDRestrictedERC1155(uri))
                .to.emit(tokenManager, "TokenDeployed");
            
            // Check token count and properties
            expect(await tokenManager.getTokenIndex()).to.equal(1);
        });

        it("should not allow an unregistered user to deploy an ERC1155 token", async function() {
            const uri = "https://myapi.com/metadata/{id}.json";
            await expect(tokenManager.connect(unauthorized).deployDIDRestrictedERC1155(uri))
                .to.be.revertedWith("Deployer is not a registered DID");
        });
    });
});
