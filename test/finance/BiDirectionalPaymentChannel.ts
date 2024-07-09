import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BiDirectionalPaymentChannel, BiDirectionalPaymentChannel__factory, IdentityManager, IdentityManager__factory } from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BiDirectionalPaymentChannel", function () {

    let identityManager: IdentityManager;
    let paymentChannel: BiDirectionalPaymentChannel;
    let owner: SignerWithAddress;
    let partyA: SignerWithAddress;
    let partyB: SignerWithAddress;
    let outsider: SignerWithAddress;

    const deposit = ethers.parseEther("0.1"); // 0.1 ether
    const duration = 86400; // 1 day in seconds
    
    beforeEach(async function() {
        [owner, partyA, partyB, outsider] = await ethers.getSigners();

        // Deploy the identityManager 
        const IdentityManagerFactory = (await ethers.getContractFactory("IdentityManager", owner)) as IdentityManager__factory;
        identityManager = await IdentityManagerFactory.deploy();
        await identityManager.getDeployedCode();
        // Initialize IdentityManager
        await identityManager.initialize();

        // Register addresses in IdentityManager
        await identityManager.connect(owner).registerIdentity(await owner.getAddress(), await owner.getAddress(), "did:doc1");
        await identityManager.connect(owner).registerIdentity(await partyA.getAddress(), await partyA.getAddress(), "did:doc2");
        await identityManager.connect(owner).registerIdentity(await partyB.getAddress(), await partyB.getAddress(), "did:doc3");

        const PaymentChannelFactory = await ethers.getContractFactory("BiDirectionalPaymentChannel", owner) as BiDirectionalPaymentChannel__factory;
        paymentChannel = await PaymentChannelFactory.deploy();
        await paymentChannel.getDeployedCode();
        await paymentChannel.connect(partyA).initialize(partyB, duration, await identityManager.getAddress(), {value: deposit});
    });

    describe("Initialization and Setup", function () {
        it("should correctly initialize bi-directional payment channel parameters", async function () {
            expect(await paymentChannel.partyA()).to.equal(partyA.address);
            expect(await paymentChannel.partyB()).to.equal(partyB.address);
            expect(await paymentChannel.duration()).to.equal(duration);
            expect(await paymentChannel.balances(partyA.address)).to.equal(deposit);
        });

        it("should not allow reinitialization", async function () {
            await expect(paymentChannel.connect(partyA).initialize(partyB.address, duration, await identityManager.getAddress(), {value: deposit}))
                .to.be.revertedWithCustomError;
        });
    });

    describe("Deposit Channel", function () {
        it("should allow partyB to deposit", async function () {
            await expect(paymentChannel.connect(partyB).deposit({value: deposit}))
                .to.emit(paymentChannel, "Deposited")
                .withArgs(partyB.address, deposit);
            expect(await paymentChannel.balances(partyB.address)).to.equal(deposit);
        });

        it("should not allow partyA to deposit", async function () {
            await expect(paymentChannel.connect(partyA).deposit({value: deposit}))
                .to.be.revertedWith("Only party B can deposit");
        });

        it("should not allow outsiders to deposit", async function () {
            await expect(paymentChannel.connect(outsider).deposit({value: deposit}))
                .to.be.revertedWith("Only party B can deposit");
        });
    });

    describe("Extend Channel", function () {
        it("should allow partyA to extend the expiration", async function () {
            const newExpiration = (await time.latest()) + duration * 2;
            await expect(paymentChannel.connect(partyA).extend(newExpiration))
                .to.emit(paymentChannel, "ChannelExtended")
                .withArgs(newExpiration);
            expect(await paymentChannel.expiration()).to.equal(newExpiration);
        });

        it("should not allow partyB to extend the expiration", async function () {
            const newExpiration = (await time.latest()) + duration * 2;
            await expect(paymentChannel.connect(partyB).extend(newExpiration))
                .to.be.revertedWith("Only party A can extend expiration");
        });

        it("should not allow extending to an earlier time", async function () {
            const newExpiration = (await time.latest()) - 1;
            await expect(paymentChannel.connect(partyA).extend(newExpiration))
                .to.be.revertedWith("New expiration must be later than current expiration");
        });
    });

    describe("Claim Timeout Channel", function () {
        it("should allow partyA to claim timeout after expiration", async function () {
            await time.increase(duration + 1);
            const initialBalance = await ethers.provider.getBalance(partyA.address);
            await paymentChannel.connect(partyA).claimTimeout();
            const finalBalance = await ethers.provider.getBalance(partyA.address);
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("should not allow claiming timeout before expiration", async function () {
            await expect(paymentChannel.connect(partyA).claimTimeout())
                .to.be.revertedWith("Channel not yet expired");
        });

        it("should not allow partyB to claim timeout", async function () {
            await time.increase(duration + 1);
            await expect(paymentChannel.connect(partyB).claimTimeout())
                .to.be.revertedWith("Only party A can claim timeout");
        });
    });

    describe("Close Channel", function () {
        it("should allow closing the channel with valid signatures", async function () {
            // First, let's have partyB deposit some funds
            const partyBDeposit = ethers.parseEther("0.05");
            await paymentChannel.connect(partyB).deposit({value: partyBDeposit});
    
            const amountA = ethers.parseEther("0.06");
            const amountB = ethers.parseEther("0.04");
            
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256"],
                [await paymentChannel.getAddress(), amountA, amountB]
            );
            const messageHashBinary = ethers.getBytes(messageHash);
            
            const signatureA = await partyA.signMessage(messageHashBinary);
            const signatureB = await partyB.signMessage(messageHashBinary);
    
            await expect(paymentChannel.connect(partyA).close(partyA.address, amountA, amountB, signatureA, signatureB))
                .to.emit(paymentChannel, "ChannelClosed")
                .withArgs(partyA.address, amountA, amountB);
        });

        it("should not allow closing with invalid signatures", async function () {
            const amountA = ethers.parseEther("0.06");
            const amountB = ethers.parseEther("0.04");
            
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256"],
                [await paymentChannel.getAddress(), amountA, amountB]
            );
            const messageHashBinary = ethers.getBytes(messageHash);
            
            const signatureA = await partyA.signMessage(messageHashBinary);
            const invalidSignature = await outsider.signMessage(messageHashBinary);

            await expect(paymentChannel.connect(partyA).close(partyA.address, amountA, amountB, signatureA, invalidSignature))
                .to.be.revertedWith("Invalid signature from party B");
        });

        it("should not allow closing with insufficient balance", async function () {
            const amountA = ethers.parseEther("0.2"); // More than the deposit
            const amountB = ethers.parseEther("0.04");
            
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256"],
                [await paymentChannel.getAddress(), amountA, amountB]
            );
            const messageHashBinary = ethers.getBytes(messageHash);
            
            const signatureA = await partyA.signMessage(messageHashBinary);
            const signatureB = await partyB.signMessage(messageHashBinary);

            await expect(paymentChannel.connect(partyA).close(partyA.address, amountA, amountB, signatureA, signatureB))
                .to.be.revertedWith("Insufficient balance for party A");
        });
    });

    describe("Pause and Unpause", function () {
        it("should allow owner to pause and unpause the contract", async function () {
            await expect(paymentChannel.connect(partyA).pause())
                .to.emit(paymentChannel, "Paused")
                .withArgs(partyA.address);

            await expect(paymentChannel.connect(partyB).deposit({value: deposit}))
                .to.be.revertedWithCustomError;

            await expect(paymentChannel.connect(partyA).unpause())
                .to.emit(paymentChannel, "Unpaused")
                .withArgs(partyA.address);

            await expect(paymentChannel.connect(partyB).deposit({value: deposit}))
                .to.not.be.reverted;
        });

        it("should not allow non-owners to pause or unpause", async function () {
            await expect(paymentChannel.connect(outsider).pause())
                .to.be.revertedWithCustomError;

            await expect(paymentChannel.connect(partyB).unpause())
                .to.be.revertedWithCustomError;
        });
    });

});