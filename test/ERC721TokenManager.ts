import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { IdentityManager, ERC721TokenManager, ERC721TokenManager__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC721TokenManager", function() {
    let tokenManager: ERC721TokenManager;
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
        identityManager.initialize();

        await identityManager.registerIdentity(user1.address, user1.address, "user1DID");
        await identityManager.registerIdentity(user2.address, user2.address, "user2DID");

        const ERC721TokenManager = await ethers.getContractFactory("ERC721TokenManager");
        tokenManager = await ERC721TokenManager.deploy();
        await tokenManager.getDeployedCode();
        await tokenManager.initialize(await identityManager.getAddress());
    });

    describe("Token Deployment", function() {
        it("should allow a registered DID to deploy an ERC721 token", async function() {
            const tx = await tokenManager.connect(user1).deployDIDRestrictedERC721("DID Art", "DIDA");
            await tx.wait();

            const token = await tokenManager.getToken(0);
            const tokenAddress = token[3];

            // Verify token properties
            const tokenContract = await ethers.getContractAt("DIDRestrictedERC20", tokenAddress);
            expect(await tokenContract.name()).to.equal("DID Art");
            expect(await tokenContract.symbol()).to.equal("DIDA");

        });

        it("should not allow an unregistered user to deploy an ERC721 token", async function() {
            await expect(tokenManager.connect(unauthorized).deployDIDRestrictedERC721("Fake Art", "FAKE"))
                .to.be.revertedWith("Deployer is not a registered DID");
        });

        it("should track the number of tokens deployed", async function() {
            const initialCount = await tokenManager.getTokenIndex();
            await tokenManager.connect(user1).deployDIDRestrictedERC721("Another Art", "AA");
            expect(await tokenManager.getTokenIndex()).to.equal(initialCount + ethers.toBigInt(1));
        });
    });
});
