import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import {  ethers } from "hardhat";
import { Billable, Billable__factory, IdentityManager, IdentityManager__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Billable", function () {
  let billable: Billable;
  let identityManager: IdentityManager;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, unauthorized] = await ethers.getSigners();

    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.initialize();

    // Register identities for testing
    await identityManager.connect(owner).registerIdentity(await owner.getAddress(), await owner.getAddress(), "did:doc1");
    await identityManager.connect(owner).registerIdentity(await addr1.getAddress(), await addr1.getAddress(), "did:doc2");
    await identityManager.connect(owner).registerIdentity(await addr2.getAddress(), await addr2.getAddress(), "did:doc3");

    const Billable = await ethers.getContractFactory("Billable") as Billable__factory;
    billable = await Billable.connect(owner).deploy();
    await billable.getDeployedCode();
    // Initialize fee set to 100 wei
    await billable.initialize(100, await identityManager.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await billable.owner()).to.equal(owner.address);
    });

    it("Initial fee should be set correctly", async function () {
      expect(await billable.getFee()).to.equal(100);
    });
  });

  describe("Fee Adjustment", function () {
    it("Should adjust the fee correctly and emit event", async function () {
        const newFee = 200;
        const tx = await billable.connect(owner).adjustFees(newFee);
        await tx.wait();
        expect(await billable.getFee()).to.equal(newFee);
    });

    it("Should fail if non-owner tries to adjust the fee", async function () {
      await expect(billable.connect(unauthorized).adjustFees(300)).to.be.revertedWith("Only DID owner can perform this action");
    });

    it("Should revert if the adjusted fee is zero", async function () {
      await expect(billable.adjustFees(0)).to.be.revertedWith("Fee must be greater than zero");
    });
  });

  describe("Fee Collection", function () {
    it("Should collect the exact fee amount", async function () {
      await expect(billable.collectFee({ value: 100 })).to.changeEtherBalances([billable, owner], [100, -100]);
    });

    it("Should revert if the fee amount is incorrect", async function () {
      await expect(billable.collectFee({ value: 90 })).to.be.revertedWith("Fee not met");
    });
  });

  describe("Withdrawal", function () {
    it("Should allow the owner to withdraw", async function () {
      await billable.collectFee({ value: 100 });
      await expect(() => billable.withdraw(owner.address)).to.changeEtherBalance(owner, 100);
    });

    it("Should fail if non-owner tries to withdraw", async function () {
      await expect(billable.connect(unauthorized).withdraw(addr1.address)).to.be.revertedWith("Only DID owner can perform this action");
    });
  });
});
