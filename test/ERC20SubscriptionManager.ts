import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import { SimpleERC20, ERC20SubscriptionManager, ERC20SubscriptionManager__factory, IdentityManager, IdentityManager__factory } from "../typechain-types";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20SubscriptionManager", function () {
    let accounts: SignerWithAddress[];
    let token: SimpleERC20;
    let identityManager: IdentityManager;
    let subscriptionManager: ERC20SubscriptionManager;
    let subscriptionManagerAddress:string;

    let owner: SignerWithAddress;
    let subscriber: SignerWithAddress;

    const fee = ethers.parseUnits("100", 18); // 100 tokens
    const duration = 86400; // 1 day in seconds
    const doubleFee = ethers.toBigInt(fee) + ethers.toBigInt(fee);

    beforeEach(async function () {
        [owner, subscriber,...accounts] = await ethers.getSigners();
        
        const Token = await ethers.getContractFactory("SimpleERC20", owner);
        token = await Token.deploy(ethers.parseUnits("100000000", 18));
        await token.getDeployedCode();

        // Deploy the identityManager 
        const IdentityManagerFactory = (await ethers.getContractFactory("IdentityManager", owner)) as IdentityManager__factory;
        identityManager = await IdentityManagerFactory.deploy();
        await identityManager.getDeployedCode();
        // Initialize IdentityManager
        await identityManager.initialize();

        // Register addresses in IdentityManager
        await identityManager.connect(owner).registerIdentity(await owner.getAddress(), await owner.getAddress(), "did:doc1");
        await identityManager.connect(owner).registerIdentity(await subscriber.getAddress(), await subscriber.getAddress(), "did:doc2");

        const ERC20SubscriptionManagerFactory = await ethers.getContractFactory("ERC20SubscriptionManager", owner) as ERC20SubscriptionManager__factory;
        const tokenAddress = await token.getAddress();
        
        subscriptionManager = await ERC20SubscriptionManagerFactory.deploy();
        await subscriptionManager.getDeployedCode();
        await subscriptionManager.initialize(tokenAddress, fee, duration, await identityManager.getAddress());

        // Transfer tokens to subscriber
        await token.transfer(await subscriber.getAddress(), ethers.parseUnits("10000", 18));

        // Approve SubscriptionManager to spend subscriber's tokens
        subscriptionManagerAddress = await subscriptionManager.getAddress();
        await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
    });

    describe("ERC20Subscription Lifecycle", function () {
        it("should allow a user to subscribe with tokens", async function () {            
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.emit(subscriptionManager, 'Subscribed')
                .withArgs(await subscriber.getAddress(), anyValue, anyValue);

                const details = await subscriptionManager.subscribers(await subscriber.getAddress());
                
                expect(details.startTime).to.be.a('BigInt');
                expect(details.endTime).to.be.a('BigInt');
                let et = ethers.toBigInt(details.endTime);
                let st = ethers.toBigInt(details.startTime);
                let val = et-st; // endtime - starttime
                expect(val).to.equal(duration);
        });

        it("should reject subscription if not enough tokens approved", async function () {
            // Reset approval to zero
            await token.connect(subscriber).approve(await subscriptionManager.getAddress(), 0);
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.be.reverted;
        });

        it("should check active subscription correctly", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            expect(await subscriptionManager.checkSubscription(await subscriber.getAddress())).to.equal(true);
            // Simulate time travel in Hardhat
            await ethers.provider.send('evm_increaseTime', [duration + 1]);
            await ethers.provider.send('evm_mine', []);
            expect(await subscriptionManager.checkSubscription(await subscriber.getAddress())).to.equal(false);
        });

        it("should allow withdrawal of tokens by owner", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            const initialBalance = await token.balanceOf(await owner.getAddress());
            await subscriptionManager.connect(owner).withdrawTokens(await owner.getAddress(), fee);
            const finalBalance = await token.balanceOf(await owner.getAddress());
            const final = finalBalance - initialBalance;
            expect(final).to.equal(fee);
        });

        it("should subscribe successfully when allowance is exactly the fee", async function () {
            await token.connect(subscriber).approve(await subscriptionManager.getAddress(), fee);
            await expect(subscriptionManager.connect(subscriber).subscribe()).to.emit(subscriptionManager, 'Subscribed');
        });

        it("should subscribe successfully when allowance is more than the fee", async function () {
            const overage = fee + BigInt(1e6); // 1e6 more than needed
            await token.connect(subscriber).approve(await subscriptionManager.getAddress(), doubleFee); 
            await expect(subscriptionManager.connect(subscriber).subscribe()).to.emit(subscriptionManager, 'Subscribed');
        });

        it("should allow and correctly handle renewals", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            const initialDetails = await subscriptionManager.subscribers(await subscriber.getAddress());
            const initialEndTime = initialDetails.endTime;

            await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
        
            // Simulate nearing the end of the subscription but not past it
            await ethers.provider.send('evm_increaseTime', [duration - 1]); // 10 seconds before the subscription ends
            await ethers.provider.send('evm_mine', []);
        
            // Renew the subscription
            await subscriptionManager.connect(subscriber).subscribe();
            const renewedDetails = await subscriptionManager.subscribers(await subscriber.getAddress());
        
            // Calculate the expected end time
            const expectedEndTime = ethers.toBigInt(initialEndTime) + ethers.toBigInt(duration); // Expecting it to add duration to the initial end time
            expect(renewedDetails.endTime).to.be.closeTo(expectedEndTime, 5); // Allowing a small leeway for block timestamp
        });
        
        it("should handle multiple consecutive renewals correctly", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            const initialDetails = await subscriptionManager.subscribers(await subscriber.getAddress());
            
            for (let i = 1; i <= 3; i++) {
                await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
                await ethers.provider.send('evm_increaseTime', [duration - 1]);
                await ethers.provider.send('evm_mine', []);
                await subscriptionManager.connect(subscriber).subscribe();
            }
            const finalDetails = await subscriptionManager.subscribers(await subscriber.getAddress());
            const expectedFinalEndTime = ethers.toBigInt(initialDetails.endTime) + ethers.toBigInt(duration * 3);
            expect(finalDetails.endTime).to.be.closeTo(expectedFinalEndTime, 5);
        });

        it("should prevent renewals after subscription cancellation", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            await subscriptionManager.connect(subscriber).cancelSubscription();
            await ethers.provider.send('evm_increaseTime', [duration]);
            await ethers.provider.send('evm_mine', []);
        
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.be.reverted; // test actual reason
        });

        it("should allow renewal exactly at the time of expiry", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            await ethers.provider.send('evm_increaseTime', [duration]);
            await ethers.provider.send('evm_mine', []);
        
            await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.emit(subscriptionManager, 'Subscribed');
        });

        it("should allow renewal just after the time of expiry", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            await ethers.provider.send('evm_increaseTime', [duration + 1]);
            await ethers.provider.send('evm_mine', []);
        
            await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.emit(subscriptionManager, 'Subscribed');
        });
    });
});
