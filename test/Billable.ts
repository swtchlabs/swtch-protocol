import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import hre from "hardhat";

describe("Billable", function () {
  let billable: hre.ethers.Contract;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await hre.ethers.getSigners();
    const Billable = await hre.ethers.getContractFactory("Billable");
    billable = await Billable.connect(owner).deploy(100);  // Initial fee set to 100 wei
    await billable.getDeployedCode();
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
      await expect(billable.connect(addr1).adjustFees(300)).to.be.revertedWith("Unauthorized");
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
      await expect(billable.connect(addr1).withdraw(addr1.address)).to.be.revertedWith("Unauthorized");
    });
  });
});
