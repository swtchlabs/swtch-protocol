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

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        subscriber = accounts[1];

        const SubscriptionManagerFactory = await ethers.getContractFactory("SubscriptionManager", owner);
        subscriptionManager = await SubscriptionManagerFactory.deploy(fee, duration);// as SubscriptionManager;
        await subscriptionManager.getDeployedCode();
    });

    describe("Subscription Lifecycle", function () {

        it("should allow a user to subscribe", async function () {
            const tx = await subscriptionManager.connect(subscriber).subscribe({ value: fee });
            const receipt = await tx.wait();
            if(receipt) {
            // console.log(tx);
            // const event = receipt.events?.find(e => e.event === 'Subscribed');
            
            expect(receipt).to.not.be.undefined;
            expect(receipt.from).to.equal(await subscriber.getAddress());
            expect(tx.value).to.equal(fee);
            // expect(event?.args?.startTime).to.be.a('BigNumber');
            // expect(event?.args?.endTime).to.be.a('BigNumber');
            // expect(event?.args?.endTime.sub(event?.args?.startTime)).to.equal(duration);

            }
        });

        it("should reject subscription if incorrect fee is paid", async function () {
            const lowerFee = hre.ethers.toBigInt(50000000000000000n);
            await expect(subscriptionManager.connect(subscriber).subscribe({ value: lowerFee }))
                .to.be.revertedWith("Incorrect fee");
        });

        it("should reject re-subscription before expiry", async function () {
            await subscriptionManager.connect(subscriber).subscribe({ value: fee });
            await expect(subscriptionManager.connect(subscriber).subscribe({ value: fee }))
                .to.be.revertedWith("Current subscription must expire before renewal");
        });

        it("should check active subscription correctly", async function () {
            await subscriptionManager.connect(subscriber).subscribe({ value: fee });
            expect(await subscriptionManager.checkSubscription(await subscriber.getAddress())).to.equal(true);
            // Simulate time travel in Hardhat
            await ethers.provider.send('evm_increaseTime', [duration + 1]);
            await ethers.provider.send('evm_mine', []);
            expect(await subscriptionManager.checkSubscription(await subscriber.getAddress())).to.equal(false);
        });

        it("should allow the owner to withdraw collected fees", async function () {
            await subscriptionManager.connect(subscriber).subscribe({ value: fee });
            const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
            await subscriptionManager.connect(owner).withdraw();
            const finalBalance = await ethers.provider.getBalance(await owner.getAddress());
            expect(finalBalance).to.be.above(initialBalance);
        });

    });

});