import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import hre from "hardhat";
import { SubscriptionManager } from "../typechain-types";
import { ethers } from "hardhat";

describe("SubscriptionManager", function () {
    type SignerType = hre.ethers.SignerWithAddress;
    let accounts: SignerType[];
    let subscriptionManager: SubscriptionManager;
    let owner: SignerType;
    let subscriber: SignerType;
    const fee = ethers.parseEther("0.1"); // 0.1 ether
    const duration = 86400; // 1 day in seconds
    const planId = 1;
    const planPrice = ethers.parseEther("0.1"); // 0.1 ether

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        subscriber = accounts[1];

        const SubscriptionManagerFactory = await ethers.getContractFactory("SubscriptionManager", owner);
        subscriptionManager = await SubscriptionManagerFactory.deploy(fee, duration);
        await subscriptionManager.getDeployedCode();

        // Add a subscription plan
        await subscriptionManager.connect(owner).addPlan(planId, planPrice);
    });

    describe("Subscription Lifecycle", function () {

        it("should allow a user to subscribe", async function () {
            const tx = await subscriptionManager.connect(subscriber).subscribe(planId, { value: planPrice });
            const receipt = await tx.wait();
            if (receipt) {
                expect(receipt).to.not.be.undefined;
                expect(receipt.from).to.equal(await subscriber.getAddress());
                expect(tx.value).to.equal(planPrice);
            }
        });

        it("should reject subscription if incorrect fee is paid", async function () {
            const lowerFee = hre.ethers.toBigInt(50000000000000000n);
            await expect(subscriptionManager.connect(subscriber).subscribe(planId, { value: lowerFee }))
                .to.be.revertedWith("Incorrect fee");
        });

        it("should reject re-subscription before expiry", async function () {
            await subscriptionManager.connect(subscriber).subscribe(planId, { value: planPrice });
            await expect(subscriptionManager.connect(subscriber).subscribe(planId, { value: planPrice }))
                .to.be.revertedWith("Current subscription must expire before renewal");
        });

        it("should check active subscription correctly", async function () {
            await subscriptionManager.connect(subscriber).subscribe(planId, { value: planPrice });
            expect(await subscriptionManager.checkSubscription(await subscriber.getAddress())).to.equal(true);
            // Simulate time travel in Hardhat
            await ethers.provider.send('evm_increaseTime', [duration + 1]);
            await ethers.provider.send('evm_mine', []);
            expect(await subscriptionManager.checkSubscription(await subscriber.getAddress())).to.equal(false);
        });

        it("should allow the owner to withdraw collected fees", async function () {
            await subscriptionManager.connect(subscriber).subscribe(planId, { value: planPrice });
            const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
            await subscriptionManager.connect(owner).withdraw();
            const finalBalance = await ethers.provider.getBalance(await owner.getAddress());
            expect(finalBalance).to.be.above(initialBalance);
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

        it("should subscribe users to different plans", async function () {
            const newPlanId = 2;
            const newPlanPrice = ethers.parseEther("0.2"); // 0.2 ether
            await subscriptionManager.connect(owner).addPlan(newPlanId, newPlanPrice);

            // Subscribe to the original plan
            await subscriptionManager.connect(subscriber).subscribe(planId, { value: planPrice });
            expect((await subscriptionManager.subscribers(await subscriber.getAddress())).planId).to.equal(planId);

            // Simulate time travel in Hardhat
            await ethers.provider.send('evm_increaseTime', [duration + 1]);
            await ethers.provider.send('evm_mine', []);

            // Subscribe to the new plan
            await subscriptionManager.connect(subscriber).subscribe(newPlanId, { value: newPlanPrice });
            expect((await subscriptionManager.subscribers(await subscriber.getAddress())).planId).to.equal(newPlanId);
        });
    });
});
