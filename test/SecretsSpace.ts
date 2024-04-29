import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import hre from "hardhat";
import { SecretsSpace } from "../typechain-types";

describe("Secrets Space", async function() {

    let secretsSpace: SecretsSpace;
    let owner: any;
    let addr1: any;
    let addrs;

    // test secret fee
    const ONE_GWEI = 1_000_000_000;
    const SECRET_FEE = hre.ethers.WeiPerEther;
    const EXCESS_FEE = hre.ethers.toBigInt(SECRET_FEE) + hre.ethers.toBigInt(SECRET_FEE);
    const ADJUSTED_FEES = hre.ethers.toBigInt(hre.ethers.WeiPerEther) + hre.ethers.toBigInt(ONE_GWEI);
      
    beforeEach(async function () {
      // Get the signers
      [owner, addr1, ...addrs] = await hre.ethers.getSigners();

      // Deploy the contract
      const SecretsSpaceFactory = await hre.ethers.getContractFactory("SecretsSpace", owner);
      secretsSpace = await SecretsSpaceFactory.deploy(SECRET_FEE);
      await secretsSpace.getDeployedCode();
    });

    describe("Deployment", function () {
      it("Should set the right owner", async function () {
        expect(await secretsSpace.owner()).to.equal(owner.address);
      });
    
      it("Should set the initial fee", async function () {
        expect(await secretsSpace.getFee()).to.equal(SECRET_FEE);
      });
    });

    // Fees
    describe("Fees", async function () {
      // Owner withdraw fees only
      it("should only allow the owner to withdraw fees", async () => {
        try {
          await secretsSpace.withdrawFees({ from: addr1 });
          assert.fail("The withdrawal did not fail as expected");
        } catch (error:any) {
          assert(error.message.includes("code=INVALID_ARGUMENT"), "Expected revert not found");
        }
      });

      // Owner fee withdrawal
      it("should allow the owner to withdraw fees", async () => {
        const contractBalanceBefore = await hre.ethers.provider.getBalance(secretsSpace.getAddress());

        if (contractBalanceBefore > 0) {
          await secretsSpace.withdrawFees({ from: owner });
        }
        const contractBalanceAfter = await hre.ethers.provider.getBalance(secretsSpace.getAddress());
        assert.equal(contractBalanceAfter, hre.ethers.toBigInt(0), "Contract balance should be 0 after withdrawal");
      });

      // Fee collection test
      it("should charge a fee for adding a secret", async () => {
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("047377a7deaaedc5aeab1acb4accdefb1b609e7d48dcc470f749e20e8e3feae702eb6c4bceac65569d80d88158436dcab324481a84f6907a2bf9bb23b645f7338b"));
        const secretValue = hre.ethers.hexlify(enc.encode("064132ec8ab78f51d2e3c3c8e7adece155b56103ea0be3e9872e9bf7b5f7ab7a"));
        const result = await secretsSpace.connect(addr1).addSecret(identifier, secretValue, {
          value: SECRET_FEE,
        });

        const contractBalanceAfter = await hre.ethers.provider.getBalance(secretsSpace.getAddress());
        // Assert the fee has been added to the smart contract
        assert.equal(contractBalanceAfter, SECRET_FEE, "Contract balance should be 0 after withdrawal");
      });

      // Owner fee adjustment
      it("should allow the owner to adjust fees", async function() {
        const feeBefore = await secretsSpace.getFee();
        assert.equal(feeBefore, SECRET_FEE, "Fee should be equal to original fee");

        await secretsSpace.connect(owner).adjustFees(ADJUSTED_FEES);
        const feeAfter = await secretsSpace.getFee();
        assert.equal(feeAfter, ADJUSTED_FEES, "Fee should be equal to new adjusted fees");
      });
    });

    // Refunds
    describe("Refunds", async function() {
      it("should refund excess fee when adding a secret", async function() {
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("041bb21ec6a4eab74ea101390ac6f351c5a3887c4492860ff499d1636b255ea90b904d793e7b8bf537b8a50f5803ab5c12b7e7d612b75b4362beba644348972929"));
        const secretValue = hre.ethers.hexlify(enc.encode("fb0709b928fa47cc29a6f5465ba35aa5fb71c965c53dcc7490bfeaf57f2e5dd7"));
        const initialBalance = await hre.ethers.provider.getBalance(addr1.address);
        
        const txResponse = await secretsSpace.connect(addr1).addSecret(identifier, secretValue, {
          value: EXCESS_FEE, // Ensure excess fee is a string when passed to the function
        });
        // Wait for the transaction to be mined
        const receipt = await txResponse.wait();
        
        const gasUsed = hre.ethers.toBigInt(receipt?.gasUsed || 0) + hre.ethers.toBigInt(receipt?.gasPrice || 0); //BigInt(txInfo.receipt.gasUsed) * BigInt(txInfo.receipt.effectiveGasPrice);
        const finalBalance = BigInt(await hre.ethers.provider.getBalance(addr1.address));

        // Ensure all arithmetic is done with BigInt, and convert to string if needed for assertions or function calls
        assert(finalBalance + gasUsed >= initialBalance - EXCESS_FEE, "Balance after refund is incorrect");
        
      });
    });

    // Add Secret event emission test
    describe("Secrets", function () {
      it("Should emit SecretAdded event", async function () {
          
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("041bb21ec6a4eab74ea101390ac6f351c5a3887c4492860ff499d1636b255ea90b904d793e7b8bf537b8a50f5803ab5c12b7e7d612b75b4362beba644348972929"));
        const secretValue = hre.ethers.hexlify(enc.encode("fb0709b928fa47cc29a6f5465ba35aa5fb71c965c53dcc7490bfeaf57f2e5dd7"));
        await expect(secretsSpace.addSecret(identifier, secretValue, { value: SECRET_FEE }))
          .to.emit(secretsSpace, "SecretAdded")
          .withArgs(identifier);
      });
    });

    describe("Ownership", function () {
      it("should only allow the owner to perform restricted actions", async () => {
        // Attempt to perform a restricted action as a non-owner
        try {
          await secretsSpace.connect(addr1).withdrawFees();
          assert.fail("The withdrawal did not fail as expected");
        } catch (error:any) {
          assert(error.message.includes("revert"), "Expected revert not found");
        }
      });
    });
});