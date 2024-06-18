import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { IdentityManager, IdentityManager__factory } from "../typechain-types";

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

    describe("Identity Registration", function () {
        it("Should allow the owner to register a new identity", async function () {
            await expect(identityManager.registerIdentity(await addr1.getAddress(), await addr1.getAddress(), "hash1"))
                .to.emit(identityManager, 'IdentityUpdated')
                .withArgs(await addr1.getAddress());
    
            const identity = await identityManager.identities(await addr1.getAddress());
            expect(identity.owner).to.equal(await addr1.getAddress());
            expect(identity.didDocument).to.equal("hash1");
        });
    
        it("Should prevent non-owners from registering identities", async function () {
            await expect(identityManager.connect(addr1).registerIdentity(await addr2.getAddress(), await addr2.getAddress(), "hash2"))
                .to.be.reverted;
        });
    
        it("Should allow updating the DID document by the owner or delegate", async function () {
            await identityManager.registerIdentity(await addr1.getAddress(), await owner.getAddress(), "initialHash");
            await identityManager.setDIDDocument(await addr1.getAddress(), "newHash");
    
            const identity = await identityManager.identities(await addr1.getAddress());
            expect(identity.didDocument).to.equal("newHash");
        });
    });

    describe("Delegate Management", function () {
        beforeEach(async function () {
            await identityManager.registerIdentity(await addr1.getAddress(), await owner.getAddress(), "docHash");
        });
    
        it("Should allow adding a delegate", async function () {
            await identityManager.addDelegate(await addr1.getAddress(), await addr2.getAddress());
            expect(await identityManager.isOwnerOrDelegate(await addr1.getAddress(), await addr2.getAddress())).to.be.true;
        });
    
        it("Should allow removing a delegate", async function () {
            await identityManager.addDelegate(await addr1.getAddress(), await addr2.getAddress());
            await identityManager.removeDelegate(await addr1.getAddress(), await addr2.getAddress());
            expect(await identityManager.isOwnerOrDelegate(await addr1.getAddress(), await addr2.getAddress())).to.be.false;
        });
    
        it("Should prevent non-owners and non-delegates from adding or removing delegates", async function () {
            await expect(identityManager.connect(addr1).addDelegate(await addr1.address, await addr2.getAddress()))
                .to.be.revertedWith("Unauthorized");
            await identityManager.addDelegate(await addr1.getAddress(), await addr1.getAddress());
            await expect(identityManager.connect(addr2).removeDelegate(await addr1.getAddress(), await addr1.getAddress()))
                .to.be.revertedWith("Unauthorized");
        });
    });

    // describe("Identity Management", function () {
    //     it("Should create new identity and claims contracts", async function () {
    //         let addr1Address = await addr1.getAddress();
    //         const tx = await identityManager.connect(owner).createIdentity(addr1Address);
    //         const receipt = await tx.wait();  // Wait for the transaction to be mined
    //         expect(receipt).to.not.be.null;
    //         // get identity and ensure it has ERC725 and ERC735 addresses bound to the identity
    //         const [fetchedIdentity, fetchedClaims] = await identityManager.getIdentity(addr1Address);
    //         expect(fetchedIdentity).to.properAddress;
    //         expect(fetchedClaims).to.properAddress;
    //     });

    //     it("Should prevent creating duplicate identities for the same owner", async function () {
    //         await identityManager.connect(owner).createIdentity(await addr1.getAddress());
    //         await expect(identityManager.connect(owner).createIdentity(await addr1.getAddress()))
    //             .to.be.revertedWith("Identity already exists");
    //     });
    // });

    // describe("Access Control", function () {
    //     it("Only owner should be able to create identities", async function () {
    //         await expect(identityManager.connect(addr1).createIdentity(await addr2.getAddress()))
    //             .to.be.reverted;
    //     });
    // });
});
