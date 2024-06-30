import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { IdentityManager, ERC20TokenManager, ERC20TokenManager__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20TokenManager", function () {

    let tokenManager: ERC20TokenManager;
    let identityManager: IdentityManager;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress; 
    let user2: SignerWithAddress; 
    let unauthorized: SignerWithAddress;

    before(async function () {
        [owner, user1, user2, unauthorized] = await ethers.getSigners();

        const IdentityManager = await ethers.getContractFactory("IdentityManager");
        identityManager = await IdentityManager.deploy();
        await identityManager.getDeployedCode();
        await identityManager.initialize();

        // Registering DIDs
        await identityManager.registerIdentity(user1.address, user1.address, "did:user1DID");
        await identityManager.registerIdentity(user2.address, user2.address, "did:user2DID");

        const TokenManager = await ethers.getContractFactory("ERC20TokenManager") as ERC20TokenManager__factory;
        tokenManager = await TokenManager.deploy() as ERC20TokenManager;
        await tokenManager.getDeployedCode();
        await tokenManager.initialize(await identityManager.getAddress());
    });

    describe("Token Deployment", function () {

        it("should deploy DIDRestrictedERC20 and verify token properties", async function () {
            const tx = await tokenManager.connect(user1).deployDIDRestrictedERC20("Token20", "TK20");
            const token = await tokenManager.getToken(0);
            const tokenAddress = token[3];

            // Verify token properties
            const tokenContract = await ethers.getContractAt("DIDRestrictedERC20", tokenAddress);
            expect(await tokenContract.name()).to.equal("Token20");
            expect(await tokenContract.symbol()).to.equal("TK20");
        });

        it("should update the token list correctly upon deployment", async function () {
            // second token deployment
            await tokenManager.connect(user1).deployDIDRestrictedERC20("Token20", "TK20");
            expect(await tokenManager.getTokenIndex()).to.equal(2);

            const token = await tokenManager.getToken(0);
            expect(token.name).to.equal("Token20");
            expect(token.symbol).to.equal("TK20");
        });

        it("should not allow an unregistered user to deploy an ERC20 token", async function () {
            await expect(tokenManager.connect(unauthorized).deployDIDRestrictedERC20("Fail Token", "FTK"))
                .to.be.revertedWith("Deployer is not a registered DID");
        });
    });
});
