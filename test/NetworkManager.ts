
import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { IdentityManager, IdentityManager__factory, NetworkManager, NetworkManager__factory } from "../typechain-types";

describe("NetworkManager", function () {
    let identityManager: IdentityManager;
    let networkManager: NetworkManager;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let randomProvider: SignerWithAddress;
    let otherRandomProvider: SignerWithAddress;
    let addrs: SignerWithAddress[];

    beforeEach(async function() {
        [owner, randomProvider, otherRandomProvider, user1, user2, ...addrs] = await ethers.getSigners();
        
        const IdentityManagerFactory = (await ethers.getContractFactory("IdentityManager", owner)) as IdentityManager__factory;
        identityManager = await IdentityManagerFactory.deploy();
        await identityManager.getDeployedCode();
        await identityManager.initialize();

        const NetworkManagerFactory = await ethers.getContractFactory("NetworkManager", owner) as NetworkManager__factory;
        networkManager = await NetworkManagerFactory.deploy() as NetworkManager;
        await networkManager.getDeployedCode();
        await networkManager.initialize(await identityManager.getAddress());

    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await networkManager.owner()).to.equal(await owner.address);
        });
    });

    describe("NetworkManager Add Network with Identity", function () {

        beforeEach(async function () {
            await identityManager.connect(owner).registerIdentity(owner.address, owner.address, "did:doc1x");
            await identityManager.connect(owner).registerIdentity(randomProvider.address, randomProvider.address, "did:doc2x");
        });

        it("Should add a new network", async function () {

            const serviceDetails = '{"name":"SWTCH Labs Mainnet","desc":"SWTCH Labs Official Network Index"}';
            expect(await networkManager.connect(randomProvider).addNetworkService(randomProvider.address, serviceDetails))
                .to.emit(networkManager, "NetworkAdded");

            expect(await networkManager.isServiceProvider(randomProvider.address)).to.be.true;
        });

    });

    describe("NetworkManager Network Management", function () {

        beforeEach(async function () {
            // Register identities for testing
            await identityManager.connect(owner).registerIdentity(randomProvider.address, randomProvider.address, "did:doc2x");
            await identityManager.connect(owner).registerIdentity(otherRandomProvider.address, otherRandomProvider.address, "did:doc3x");
    
            // Add initial network services for testing
            await networkManager.connect(randomProvider).addNetworkService(randomProvider.address, '{"name":"Initial Service"}');
        });
    
        it("Should update a network service correctly", async function () {
            const newServiceDetails = '{"name":"Updated Service"}';
            await expect(networkManager.connect(randomProvider).updateNetworkService(randomProvider.address, newServiceDetails))
                .to.emit(networkManager, "NetworkUpdated")
                .withArgs(randomProvider.address, '{"name":"Initial Service"}', newServiceDetails);
        });
    
        it("Should remove a network service correctly and ensure data cleanup", async function () {
            await expect(networkManager.connect(randomProvider).removeNetworkService(randomProvider.address))
                .to.emit(networkManager, "NetworkRemoved")
                .withArgs(randomProvider.address, '{"name":"Initial Service"}');
    
            expect(await networkManager.isServiceProvider(randomProvider.address)).to.be.false;
            // Ensuring the serviceProviders array is cleaned up properly
            expect(await networkManager.getServiceProviders()).to.not.include(randomProvider.address);
        });
    
        it("Should prevent unauthorized users from adding, updating, or removing network services", async function () {
            const unauthorizedServiceDetails = '{"name":"Unauthorized Service"}';
            await expect(networkManager.connect(user1).addNetworkService(user1.address, unauthorizedServiceDetails))
                .to.be.revertedWith("Only DID owner can perform this action");
    
            // Attempt to update or remove a service by a non-owner/non-delegate
            await expect(networkManager.connect(user1).updateNetworkService(randomProvider.address, unauthorizedServiceDetails))
                .to.be.revertedWith("Only DID owner can perform this action");
    
            await expect(networkManager.connect(user1).removeNetworkService(randomProvider.address))
                .to.be.revertedWith("Only DID owner can perform this action");
        });
    
        it("Should handle multiple network services correctly", async function () {
            const additionalServiceDetails = '{"name":"Additional Service"}';
            await networkManager.connect(otherRandomProvider).addNetworkService(otherRandomProvider.address, additionalServiceDetails);
    
            const isRandomProviderServiceActive = await networkManager.isServiceProvider(randomProvider.address);
            const isOtherRandomProviderServiceActive = await networkManager.isServiceProvider(otherRandomProvider.address);
            expect(isRandomProviderServiceActive).to.be.true;
            expect(isOtherRandomProviderServiceActive).to.be.true;
        });
    });

});