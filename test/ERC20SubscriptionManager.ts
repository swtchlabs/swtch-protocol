import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import hre from "hardhat";
import { SimpleERC20, ERC20SubscriptionManager, ERC20SubscriptionManager__factory } from "../typechain-types";
// import { ethers } from "hardhat";
import { Signer } from "ethers";

describe("ERC20SubscriptionManager", function () {
    let accounts: Signer[];
    let token: SimpleERC20;
    let subscriptionManager: ERC20SubscriptionManager;
    let subscriptionManagerAddress:string;
    let owner: Signer;
    let subscriber: Signer;
    const fee = hre.ethers.parseUnits("100", 18); // 100 tokens
    const duration = 86400; // 1 day in seconds
    const doubleFee = hre.ethers.toBigInt(fee) + hre.ethers.toBigInt(fee);

    beforeEach(async function () {
        accounts = await hre.ethers.getSigners();
        owner = accounts[0];
        subscriber = accounts[1];

        const Token = await hre.ethers.getContractFactory("SimpleERC20", owner);
        token = await Token.deploy(hre.ethers.parseUnits("100000000", 18));
        await token.getDeployedCode();

        const ERC20SubscriptionManagerFactory = await hre.ethers.getContractFactory("ERC20SubscriptionManager", owner);
        const tokenAddress = await token.getAddress();
        
        subscriptionManager = await ERC20SubscriptionManagerFactory.deploy(tokenAddress, fee, duration); //) as ERC20SubscriptionManager;
        await subscriptionManager.getDeployedCode();

        // Transfer tokens to subscriber
        await token.transfer(await subscriber.getAddress(), hre.ethers.parseUnits("10000", 18));

        // Approve SubscriptionManager to spend subscriber's tokens
        subscriptionManagerAddress = await subscriptionManager.getAddress();
        await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
    });

    describe("ERC20Subscription Lifecycle", function () {
        it("should allow a user to subscribe with tokens", async function () {
            const subBalance = await token.balanceOf(await subscriber.getAddress());
            // console.log(`Subscriber Balance: ${hre.ethers.formatUnits(subBalance, 18)}`);
            const subAllowance = await token.allowance(await subscriber.getAddress(), subscriptionManagerAddress);
            // console.log(`Subscriber Allowance: ${hre.ethers.formatUnits(subAllowance, 18)}`);
            
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.emit(subscriptionManager, 'Subscribed')
                .withArgs(await subscriber.getAddress(), anyValue, anyValue);

                const details = await subscriptionManager.subscribers(await subscriber.getAddress());
                
                expect(details.startTime).to.be.a('BigInt');
                expect(details.endTime).to.be.a('BigInt');
                let et = hre.ethers.toBigInt(details.endTime);
                let st = hre.ethers.toBigInt(details.startTime);
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
            await hre.ethers.provider.send('evm_increaseTime', [duration + 1]);
            await hre.ethers.provider.send('evm_mine', []);
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
            await hre.ethers.provider.send('evm_increaseTime', [duration - 1]); // 10 seconds before the subscription ends
            await hre.ethers.provider.send('evm_mine', []);
        
            // Renew the subscription
            await subscriptionManager.connect(subscriber).subscribe();
            const renewedDetails = await subscriptionManager.subscribers(await subscriber.getAddress());
        
            // Calculate the expected end time
            const expectedEndTime = hre.ethers.toBigInt(initialEndTime) + hre.ethers.toBigInt(duration); // Expecting it to add duration to the initial end time
            expect(renewedDetails.endTime).to.be.closeTo(expectedEndTime, 5); // Allowing a small leeway for block timestamp
        });
        
        it("should handle multiple consecutive renewals correctly", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            const initialDetails = await subscriptionManager.subscribers(await subscriber.getAddress());
            
            for (let i = 1; i <= 3; i++) {
                await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
                await hre.ethers.provider.send('evm_increaseTime', [duration - 1]);
                await hre.ethers.provider.send('evm_mine', []);
                await subscriptionManager.connect(subscriber).subscribe();
            }
            const finalDetails = await subscriptionManager.subscribers(await subscriber.getAddress());
            const expectedFinalEndTime = hre.ethers.toBigInt(initialDetails.endTime) + hre.ethers.toBigInt(duration * 3);
            expect(finalDetails.endTime).to.be.closeTo(expectedFinalEndTime, 5);
        });

        it("should prevent renewals after subscription cancellation", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            await subscriptionManager.connect(subscriber).cancelSubscription();
            await hre.ethers.provider.send('evm_increaseTime', [duration]);
            await hre.ethers.provider.send('evm_mine', []);
        
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.be.reverted; // test actual reason
        });

        it("should allow renewal exactly at the time of expiry", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            await hre.ethers.provider.send('evm_increaseTime', [duration]);
            await hre.ethers.provider.send('evm_mine', []);
        
            await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.emit(subscriptionManager, 'Subscribed');
        });

        it("should allow renewal just after the time of expiry", async function () {
            await subscriptionManager.connect(subscriber).subscribe();
            await hre.ethers.provider.send('evm_increaseTime', [duration + 1]);
            await hre.ethers.provider.send('evm_mine', []);
        
            await token.connect(subscriber).approve(subscriptionManagerAddress, fee);
            await expect(subscriptionManager.connect(subscriber).subscribe())
                .to.emit(subscriptionManager, 'Subscribed');
        });
    });
});
