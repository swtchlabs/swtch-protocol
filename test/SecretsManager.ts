import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import hre from "hardhat";
import { SecretsManager, SecretsSpace, IdentityManager } from "../typechain-types";
import { ethers } from "hardhat";

describe("SecretsManager", function () {
    let secretsManager: SecretsManager;
    let didManager: IdentityManager;
    type SignerType = hre.ethers.SignerWithAddress;
    let owner: SignerType;
    let user1: SignerType;
    let user2: SignerType;
    let addrs: SignerType[];

    const SECRET_FEE = hre.ethers.WeiPerEther;

    beforeEach(async function () {
        [owner, user1, user2, ...addrs] = await hre.ethers.getSigners();

        const IdentityManagerFactory = await hre.ethers.getContractFactory("IdentityManager", owner);
        didManager = await IdentityManagerFactory.deploy();
        await didManager.getDeployedCode();
        await didManager.initialize(); 

        const SecretsManagerFactory = await hre.ethers.getContractFactory("SecretsManager", owner);
        secretsManager = await SecretsManagerFactory.deploy(SECRET_FEE, await didManager.getAddress());
        await secretsManager.getDeployedCode();

        // Register identities for testing
        await didManager.connect(owner).registerIdentity(await user1.getAddress(), await user1.getAddress(), "doc1");
        await didManager.connect(owner).registerIdentity(await user2.getAddress(), await user2.getAddress(), "doc2");
        // await didManager.connect(owner).addDelegate(await user2.getAddress(), await user2.getAddress());
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await secretsManager.owner()).to.equal(await owner.getAddress());
        });
    });

    describe("Manage Spaces", function () {

        beforeEach(async function () {
            // Ensure parent space exists for subspace tests
            await secretsManager.connect(user1).addSpace(await user1.getAddress());
        });

        it("Should allow owner to add subspaces", async function () {
            // await expect()
            //     .to.emit(secretsManager, 'SubSpaceAdded')
            //     .withArgs(await user1.getAddress(), await user2.getAddress(), ethers.ZeroAddress); // Mocked address
            let tx = secretsManager.connect(user1).addSubSpace(await user1.getAddress(), await user2.getAddress());
            (await tx).wait;

            let subspaces = await secretsManager.getSubSpaces(await user1.getAddress());
            expect(subspaces.length).to.eq(1);
        });

        it("Should not allow non-owner to add a space", async function () {
            await expect(secretsManager.connect(user1).addSpace(await user2.getAddress())).to.be.revertedWith("Only DID owner can perform this action");
        });

        it("Should allow owner to add subspaces", async function () {

            await expect(secretsManager.connect(user1).addSubSpace(await user1.getAddress(), await user2.getAddress()))
                .to.emit(secretsManager, "SubSpaceAdded")
                
            const subspace = await secretsManager.spaces(await user2.getAddress());
            expect(subspace.deployed).to.properAddress;
            expect(subspace.enabled).to.be.true;
            const subspaces = await secretsManager.getSubSpaces(await user1.getAddress());
            expect(subspaces).to.include(subspace.deployed);
        });

        it("Should prevent duplicate spaces", async function () {
            await expect(secretsManager.connect(user1).addSpace(await user1.getAddress())).to.be.revertedWith("Space already exists for this user");
        });

        it("Should disable spaces correctly", async function () {
            // await secretsManager.addSpace(await user1.getAddress());
            await secretsManager.connect(user1).disableSpace(await user1.getAddress());
            const space = await secretsManager.spaces(await user1.getAddress());
            expect(space.enabled).to.be.false;
        });
    });
});
