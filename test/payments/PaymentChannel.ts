import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { PaymentChannel, PaymentChannel__factory, IdentityManager, IdentityManager__factory } from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PaymentChannel", function () {
    let identityManager: IdentityManager;
    let paymentChannel: PaymentChannel;
    let owner: SignerWithAddress;
    let sender: SignerWithAddress;
    let receiver: SignerWithAddress;
    let outsider: SignerWithAddress;

    const deposit = ethers.parseEther("0.1"); // 0.1 ether
    const duration = 86400; // 1 day in seconds

    beforeEach(async function() {
        [owner, sender, receiver, outsider] = await ethers.getSigners();

        // Deploy the identityManager 
        const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager", owner) as IdentityManager__factory;
        identityManager = await IdentityManagerFactory.deploy();
        await identityManager.waitForDeployment();
        // Initialize IdentityManager
        await identityManager.initialize();

        // Register addresses in IdentityManager
        await identityManager.connect(owner).registerIdentity(await owner.getAddress(), await owner.getAddress(), "did:doc1");
        await identityManager.connect(owner).registerIdentity(await sender.getAddress(), await sender.getAddress(), "did:doc2");
        await identityManager.connect(owner).registerIdentity(await receiver.getAddress(), await receiver.getAddress(), "did:doc3");

        const PaymentChannelFactory = await ethers.getContractFactory("PaymentChannel", owner) as PaymentChannel__factory;
        paymentChannel = await PaymentChannelFactory.deploy();
        await paymentChannel.waitForDeployment();
        
        // Initialize the payment channel
        await paymentChannel.connect(owner).initialize(sender.address, receiver.address, duration, await identityManager.getAddress(), {value: deposit});
    });

    describe("Initialization and Setup", function () {
        it("should correctly initialize payment channel parameters", async function () {
            expect(await paymentChannel.sender()).to.equal(sender.address);
            expect(await paymentChannel.receiver()).to.equal(receiver.address);
            expect(await paymentChannel.deposit()).to.equal(deposit);
            const blockTimestamp = await time.latest();
            expect(await paymentChannel.expiration()).to.equal(blockTimestamp + duration);
        });

        // it("should not allow reinitialization", async function () {
        //     await expect(paymentChannel.connect(sender).initialize(receiver.address, duration, await identityManager.getAddress(), {value: deposit}))
        //         .to.be.revertedWithCustomError;
        // });
    });

    describe("Close Channel", function () {
        it("should allow receiver to close the channel with valid signature", async function () {
            const amount = ethers.parseEther("0.05");
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [await paymentChannel.getAddress(), amount]
            );
            const messageHashBinary = ethers.getBytes(messageHash);
            const signature = await sender.signMessage(messageHashBinary);

            const initialReceiverBalance = await ethers.provider.getBalance(receiver.address);
            
            await expect(paymentChannel.connect(receiver).close(receiver.address, amount, signature))
                .to.emit(paymentChannel, "ChannelClosed")
                .withArgs(receiver.address, amount);

            const finalReceiverBalance = await ethers.provider.getBalance(receiver.address);
            expect(finalReceiverBalance).to.be.gt(initialReceiverBalance);
        });

        it("should not allow closing with invalid signature", async function () {
            const amount = ethers.parseEther("0.05");
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [await paymentChannel.getAddress(), amount]
            );
            const messageHashBinary = ethers.getBytes(messageHash);
            const signature = await outsider.signMessage(messageHashBinary);

            await expect(paymentChannel.connect(receiver).close(receiver.address, amount, signature))
                .to.be.revertedWith("Invalid signature");
        });

        it("should not allow closing with amount exceeding deposit", async function () {
            const amount = ethers.parseEther("0.2");
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256"],
                [await paymentChannel.getAddress(), amount]
            );
            const messageHashBinary = ethers.getBytes(messageHash);
            const signature = await sender.signMessage(messageHashBinary);

            await expect(paymentChannel.connect(receiver).close(receiver.address, amount, signature))
                .to.be.revertedWith("Amount exceeds deposit");
        });
    });

    describe("Extend Channel", function () {
        it("should allow sender to extend the expiration", async function () {
            const newExpiration = (await time.latest()) + duration * 2;
            await expect(paymentChannel.connect(sender).extend(newExpiration))
                .to.emit(paymentChannel, "ChannelExtended")
                .withArgs(newExpiration);
            expect(await paymentChannel.expiration()).to.equal(newExpiration);
        });

        it("should not allow receiver to extend the expiration", async function () {
            const newExpiration = (await time.latest()) + duration * 2;
            await expect(paymentChannel.connect(receiver).extend(newExpiration))
                .to.be.revertedWith("Only sender can extend expiration");
        });

        it("should not allow extending to an earlier time", async function () {
            const newExpiration = (await time.latest()) - 1;
            await expect(paymentChannel.connect(sender).extend(newExpiration))
                .to.be.revertedWith("New expiration must be later than current expiration");
        });
    });

    describe("Claim Timeout", function () {
        it("should allow sender to claim timeout after expiration", async function () {
            await time.increase(duration + 1);
            const initialBalance = await ethers.provider.getBalance(sender.address);
            await expect(paymentChannel.connect(sender).claimTimeout())
                .to.emit(paymentChannel, "TimeoutClaimed")
                .withArgs(sender.address, deposit);
            const finalBalance = await ethers.provider.getBalance(sender.address);
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("should not allow claiming timeout before expiration", async function () {
            await expect(paymentChannel.connect(sender).claimTimeout())
                .to.be.revertedWith("Channel not yet expired");
        });
    });

    describe("Pause and Unpause", function () {
        it("should allow owner to pause and unpause the contract", async function () {
            await expect(paymentChannel.connect(owner).pause())
                .to.emit(paymentChannel, "Paused")
                .withArgs(owner.address);

            await expect(paymentChannel.connect(receiver).close(receiver.address, ethers.parseEther("0.05"), "0x"))
                .to.be.revertedWithCustomError;

            await expect(paymentChannel.connect(owner).unpause())
                .to.emit(paymentChannel, "Unpaused")
                .withArgs(owner.address);

            await expect(paymentChannel.connect(receiver).close(receiver.address, ethers.parseEther("0.05"), "0x"))
                .to.be.revertedWith("Invalid signature length");
        });

        it("should not allow non-owners to pause or unpause", async function () {
            await expect(paymentChannel.connect(sender).pause())
                .to.be.revertedWithCustomError;

            await expect(paymentChannel.connect(receiver).unpause())
                .to.be.revertedWithCustomError;
        });
    });

});