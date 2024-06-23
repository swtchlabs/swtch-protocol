import { expect, assert } from "chai";
import hre from "hardhat";
import { IdentityManager, IdentityManager__factory, SubscriptionManager, SubscriptionManager__factory } from "../typechain-types";
import { ethers, upgrades } from "hardhat";

describe("SubscriptionManager", function () {
    type SignerType = hre.ethers.SignerWithAddress;
    
    let subscriptionManager: SubscriptionManager;
    let identityManager: IdentityManager;

    let owner: SignerType;
    let subscriber: SignerType;
    let addr2: SignerType;
    let accounts: SignerType[];

    const fee = ethers.parseEther("0.1"); // 0.1 ether
    const duration = 86400; // 1 day in seconds
    const subscriptionDuration = 30 * 24 * 60 * 60; // 30 days in seconds
    const planId = 1;
    const planPrice = ethers.parseEther("0.1"); // 0.1 ether

    beforeEach(async function () {
        [owner, subscriber, addr2,...accounts] = await ethers.getSigners();

        // Deploy the identityManager 
        const IdentityManagerFactory = (await ethers.getContractFactory("IdentityManager", owner)) as IdentityManager__factory;
        identityManager = await IdentityManagerFactory.deploy();
        await identityManager.getDeployedCode();

        await identityManager.initialize();

        const SubscriptionManagerFactory = await ethers.getContractFactory("SubscriptionManager", owner) as SubscriptionManager__factory;
        subscriptionManager = await SubscriptionManagerFactory.deploy(fee, duration, await identityManager.getAddress());
        await subscriptionManager.getDeployedCode();

        // Register addresses in IdentityManager
        await identityManager.connect(owner).registerIdentity(await owner.getAddress(), await owner.getAddress(), "did:doc1");
        await identityManager.connect(owner).addDelegate(await owner.getAddress(), await addr2.getAddress());

        // Add a subscription plan
        await subscriptionManager.connect(owner).addPlan(planId, planPrice);
    });

    describe("Initialization and Setup", function () {
        it("should correctly initialize subscription parameters", async function () {
            expect(await subscriptionManager.subscriptionFee()).to.equal(fee);
            expect(await subscriptionManager.subscriptionDuration()).to.equal(duration);
        });
    });

    describe("Plan Management", function () {
        it("should allow the owner to add and update plans", async function () {
            await expect(subscriptionManager.addPlan(planId, planPrice))
                .to.emit(subscriptionManager, "PlanAdded")
                .withArgs(planId, planPrice);

            const newPlanPrice = ethers.parseEther("0.2");
            await expect(subscriptionManager.updatePlan(planId, newPlanPrice))
                .to.emit(subscriptionManager, "PlanUpdated")
                .withArgs(planId, newPlanPrice);
        });

        it("should prevent non-owners from adding or updating plans", async function () {
            await expect(subscriptionManager.connect(addr2).addPlan(planId, planPrice))
                .to.be.revertedWith("Unauthorized");

            const newPlanPrice = ethers.parseEther("0.2");
            await expect(subscriptionManager.connect(addr2).updatePlan(planId, newPlanPrice))
                .to.be.revertedWith("Unauthorized");
        });
    });

    describe("Subscription Processes", function () {
        beforeEach(async function () {
            // Add a plan for subscription tests
            await subscriptionManager.addPlan(planId, planPrice);
        });

        it("should allow a DID owner or delegate to subscribe", async function () {

            expect(await identityManager.isOwnerOrDelegate(owner.address, addr2.address)).to.be.true;
            
            // Subscribing with addr1 who is the DID owner
            await expect(subscriptionManager.connect(owner).subscribe(planId, { value: planPrice }))
                .to.emit(subscriptionManager, "Subscribed");
                // .withArgs(owner.address, currentBlock.timestamp, expectedEndTime, planId);

            // Subscribing with addr2 who is a delegate
            await expect(subscriptionManager.connect(addr2).subscribe(planId, { value: planPrice }))
                .to.emit(subscriptionManager, "Subscribed");
                // .withArgs(addr2.address, startTime, expectedEndTime, planId);
        });

        it("should prevent unauthorized addresses from subscribing", async function () {
            await expect(subscriptionManager.connect(accounts[0]).subscribe(planId, { value: planPrice }))
                .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
        });

        it("should handle subscription renewals and cancellations", async function () {
            await subscriptionManager.connect(owner).subscribe(planId, { value: planPrice });
            await expect(subscriptionManager.connect(owner).cancelSubscription())
                .to.emit(subscriptionManager, "SubscriptionCancelled")
                .withArgs(owner.address);
        });

        it("should allow the owner to add a new plan", async function () {
            const newPlanId = 2;
            const newPlanPrice = ethers.parseEther("0.2"); // 0.2 ether
            await subscriptionManager.connect(owner).addPlan(newPlanId, newPlanPrice);
            expect(await subscriptionManager.plans(newPlanId)).to.equal(newPlanPrice);
        });

        it("should allow the owner to update an existing plan", async function () {
            const newPlanPrice = ethers.parseEther("0.2"); // 0.2 ether
            await subscriptionManager.connect(owner).updatePlan(planId, newPlanPrice);
            expect(await subscriptionManager.plans(planId)).to.equal(newPlanPrice);
        });
    });

    describe("Withdrawal and Financial Operations", function () {
        it("should allow only the owner to withdraw collected fees", async function () {
            // Assume some fees have been collected
            await subscriptionManager.connect(owner).subscribe(planId, { value: planPrice });
            await expect(() => subscriptionManager.withdraw())
                .to.changeEtherBalances([subscriptionManager, owner], [-planPrice, planPrice]);
        });
    });

});
