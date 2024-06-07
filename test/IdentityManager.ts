import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("IdentityManager", function () {
    let identityManager: any;
    let owner: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;
    let addr4: any;
    let addrs: any[];

    beforeEach(async function () {
        // Get some signers
        [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

        // Deploy the IdentityManager as an upgradeable contract using TypeChain factory
        const identityManagerFactory = (await ethers.getContractFactory("IdentityManager", owner));
        identityManager = await upgrades.deployProxy(identityManagerFactory, []);
        await identityManager.getDeployedCode();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await identityManager.owner()).to.equal(owner.address);
        });
    });

    describe("Identity Management", function () {
        it("Should create new identity and claims contracts", async function () {
            let addr1Address = await addr1.getAddress();
            const tx = await identityManager.connect(owner).createIdentity(addr1Address);
            const receipt = await tx.wait();  // Wait for the transaction to be mined
            expect(receipt).to.not.be.null;
            // get identity and ensure it has ERC725 and ERC735 addresses bound to the identity
            const [fetchedIdentity, fetchedClaims] = await identityManager.getIdentity(addr1Address);
            expect(fetchedIdentity).to.properAddress;
            expect(fetchedClaims).to.properAddress;
        });

        it("Should prevent creating duplicate identities for the same owner", async function () {
            await identityManager.connect(owner).createIdentity(await addr1.getAddress());
            await expect(identityManager.connect(owner).createIdentity(await addr1.getAddress()))
                .to.be.revertedWith("Identity already exists");
        });
    });

    describe("Access Control", function () {
        it("Only owner should be able to create identities", async function () {
            await expect(identityManager.connect(addr1).createIdentity(await addr2.getAddress()))
                .to.be.reverted;
        });
    });
});
