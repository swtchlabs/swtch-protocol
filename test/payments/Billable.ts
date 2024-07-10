import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  Billable,
  Billable__factory,
  IdentityManager,
  IdentityManager__factory
} from "../../typechain-types";

describe("Billable", function () {
  let billable: Billable;
  let identityManager: IdentityManager;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let outsider: SignerWithAddress;

  const initialFee = ethers.parseEther("0.1");

  beforeEach(async function () {
    [owner, user1, user2, outsider] = await ethers.getSigners();

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.getDeployedCode();
    await identityManager.initialize();

    // Register DIDs
    await identityManager.registerIdentity(owner.address, owner.address, "did:owner");
    await identityManager.registerIdentity(user1.address, user1.address, "did:user1");
    await identityManager.registerIdentity(user2.address, user2.address, "did:user2");

    // Deploy Billable
    const BillableFactory = await ethers.getContractFactory("Billable") as Billable__factory;
    billable = await BillableFactory.deploy(); //await upgrades.deployProxy(BillableFactory, [initialFee, await identityManager.getAddress()]) as any;
    // await billable.waitForDeployment();
    await billable.getDeployedCode();
    await billable.initialize(initialFee, await identityManager.getAddress());
  });

  describe("Initialization", function () {
    it("should set the correct initial fee", async function () {
      expect(await billable.getFee()).to.equal(initialFee);
    });

    it("should set the correct owner", async function () {
      expect(await billable.owner()).to.equal(owner.address);
    });
  });

  describe("Fee Adjustment", function () {
    it("should allow the owner to adjust fees", async function () {
      const newFee = ethers.parseEther("0.2");
      const tx = await billable.connect(owner).adjustFees(newFee);
      const receipt = await tx.wait();
  
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const timestamp = block!.timestamp;
  
      await expect(tx)
        .to.emit(billable, "FeesAdjusted")
        .withArgs(owner.address, initialFee, newFee, timestamp);
  
      expect(await billable.getFee()).to.equal(newFee);
    });

    it("should not allow non-owners to adjust fees", async function () {
      await expect(billable.connect(outsider).adjustFees(ethers.parseEther("0.2")))
        .to.be.revertedWith("Only DID owner can perform this action");
    });

    it("should not allow setting fee to zero", async function () {
      await expect(billable.connect(owner).adjustFees(0))
        .to.be.revertedWith("Fee must be greater than zero");
    });
  });

  describe("Fee Collection", function () {
    it("should allow users to pay the correct fee", async function () {
      const tx = await billable.connect(user1).collectFee({ value: initialFee });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const timestamp = block!.timestamp;
  
      await expect(tx)
        .to.emit(billable, "FeeCollected")
        .withArgs(user1.address, initialFee, timestamp);
  
      expect(await billable.getUserBalance(user1.address)).to.equal(initialFee);
      expect(await billable.getTotalCollected()).to.equal(initialFee);
    });
  
    it("should not allow users to pay an incorrect fee", async function () {
      await expect(billable.connect(user1).collectFee({ value: ethers.parseEther("0.05") }))
        .to.be.revertedWith("Fee not met");
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      await billable.connect(user1).collectFee({ value: initialFee });
    });
  
    it("should allow users to withdraw their balance", async function () {
      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await billable.connect(user1).withdraw(user1.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const timestamp = block!.timestamp;
  
      await expect(tx)
        .to.emit(billable, "Withdrawn")
        .withArgs(user1.address, initialFee, timestamp);
  
      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      expect(await billable.getUserBalance(user1.address)).to.equal(0);
    });
  
    it("should not allow users to withdraw if they have no balance", async function () {
      await expect(billable.connect(user2).withdraw(user2.address))
        .to.be.revertedWith("No balance to withdraw");
    });
  
    it("should allow the owner to withdraw all funds", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);
      const tx = await billable.connect(owner).withdrawAll();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const timestamp = block!.timestamp;
  
      await expect(tx)
        .to.emit(billable, "Withdrawn")
        .withArgs(owner.address, initialFee, timestamp);
  
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Receive and Fallback", function () {
    it("should collect fee when receiving a direct transfer", async function () {
      const tx = await user1.sendTransaction({ to: await billable.getAddress(), value: initialFee });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const timestamp = block!.timestamp;
  
      await expect(tx)
        .to.emit(billable, "FeeCollected")
        .withArgs(user1.address, initialFee, timestamp);
  
      expect(await billable.getUserBalance(user1.address)).to.equal(initialFee);
    });
  });
});