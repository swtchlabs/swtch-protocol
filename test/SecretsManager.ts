import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import hre from "hardhat";
import { SecretsManager, SecretsSpace } from "../typechain-types";
import { ethers } from "hardhat";

describe("SecretsManager", function () {
    let secretsManager: SecretsManager;
    type SignerType = hre.ethers.SignerWithAddress;
    let owner: SignerType;
    let user1: SignerType;
    let user2: SignerType;
    let addrs: SignerType[];

    const SECRET_FEE = hre.ethers.WeiPerEther;

    beforeEach(async function () {
        [owner, user1, user2, ...addrs] = await hre.ethers.getSigners();

        const SecretsManagerFactory = await hre.ethers.getContractFactory("SecretsManager", owner);
        secretsManager = await SecretsManagerFactory.deploy(SECRET_FEE);
        await secretsManager.getDeployedCode();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await secretsManager.owner()).to.equal(owner.address);
        });
    });

    describe("Manage Spaces", function () {
        it("Should allow owner to add a space", async function () {
            await expect(secretsManager.addSpace(user1.address))
                .to.emit(secretsManager, "SpaceAdded");
                // .withArgs(user1.address, user1.address); // assuming the event args are user and deployedAddress
            const space = await secretsManager.spaces(user1.address);
            expect(space.deployed).to.properAddress;
            expect(space.enabled).to.be.true;
        });

        it("Should not allow non-owner to add a space", async function () {
            await expect(secretsManager.connect(user1).addSpace(user2.address)).to.be.revertedWith("Only owner may perform this action");
        });

        it("Should allow owner to add subspaces", async function () {
            await secretsManager.addSpace(user1.address);
            await expect(secretsManager.addSubSpace(user1.address, user2.address))
                .to.emit(secretsManager, "SubSpaceAdded")
                
            const subspace = await secretsManager.spaces(user2.address);
            expect(subspace.deployed).to.properAddress;
            expect(subspace.enabled).to.be.true;
            const subspaces = await secretsManager.getSubSpaces(user1.address);
            expect(subspaces).to.include(subspace.deployed);
        });

        it("Should prevent duplicate spaces", async function () {
            await secretsManager.addSpace(user1.address);
            await expect(secretsManager.addSpace(user1.address)).to.be.revertedWith("Space already exists for this user");
        });

        it("Should disable spaces correctly", async function () {
            await secretsManager.addSpace(user1.address);
            await secretsManager.disableSpace(user1.address);
            const space = await secretsManager.spaces(user1.address);
            expect(space.enabled).to.be.false;
        });
    });
});
