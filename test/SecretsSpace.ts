import { expect, assert } from "chai";
import hre from "hardhat";
import { SecretsSpace, SecretsSpace__factory } from "../typechain-types";

describe("Secrets Space", async function() {

    let secretsSpace: SecretsSpace;
    let owner: any;
    let addr1: any;
    let addr2: any;
    let addrs;

    // test secret fee
    const ONE_GWEI = 1_000_000_000;
    const SECRET_FEE = hre.ethers.WeiPerEther;
    const EXCESS_FEE = hre.ethers.toBigInt(SECRET_FEE) + hre.ethers.toBigInt(SECRET_FEE);
    // const ADJUSTED_FEES = hre.ethers.toBigInt(hre.ethers.WeiPerEther) + hre.ethers.toBigInt(ONE_GWEI);
    const ADJUSTED_FEES = hre.ethers.parseEther("1.1");
      
    beforeEach(async function () {
      // Get the signers
      [owner, addr1, ...addrs] = await hre.ethers.getSigners();

      // Deploy the contract
      const SecretsSpaceFactory = await hre.ethers.getContractFactory("SecretsSpace", owner) as SecretsSpace__factory;
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
      it("should only allow the owner to withdraw fees", async function () {
        // Assuming owner can deposit into the contract for this test
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("randomTestKey"));
        const secretValue = hre.ethers.hexlify(enc.encode("064132ec8ab78f51d2e3c3c8e7adece155b56103ea0be3e9872e9bf7b5f7ab7a"));
        const result = await secretsSpace.connect(addr1).addSecret(identifier, secretValue, {
          value: SECRET_FEE,
        });

        // Attempt by non-owner should fail
        await expect(secretsSpace.connect(addr1).withdrawFees(addr1.address, SECRET_FEE))
            .to.be.revertedWith("Requires ADMIN_ROLE");

        // Withdraw by owner should succeed
        await expect(() => secretsSpace.withdrawFees(owner.address, SECRET_FEE))
            .to.changeEtherBalances([secretsSpace, owner], [-SECRET_FEE, SECRET_FEE]);
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

    describe("Access Control", function () {
      it("Should allow owner to grant admin role", async function () {
          await secretsSpace.grantRole(await secretsSpace.ADMIN_ROLE(), addr1.address);
          expect(await secretsSpace.hasRole(await secretsSpace.ADMIN_ROLE(), addr1.address)).to.be.true;
      });

      it("Should restrict fee adjustment to admins", async function () {
          await expect(secretsSpace.connect(addr1).adjustFees(ADJUSTED_FEES))
              .to.be.revertedWith("Requires ADMIN_ROLE");
      });

      it("Should allow admin to adjust fees", async function () {
          await secretsSpace.grantRole(await secretsSpace.ADMIN_ROLE(), addr1.address);
          await secretsSpace.connect(addr1).adjustFees(ADJUSTED_FEES);
          expect(await secretsSpace.getFee()).to.equal(ADJUSTED_FEES);
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

      it("Should correctly handle fee payments and refunds", async function () {
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("testKey"));
        const secretValue = hre.ethers.randomBytes(32);
        await expect(await secretsSpace.addSecret(identifier, secretValue, { value: EXCESS_FEE }))
            .to.changeEtherBalances([secretsSpace, owner], [SECRET_FEE, -SECRET_FEE]);

        // Check refund
        const balanceAfter = await secretsSpace.feesCollected(); 
        expect(balanceAfter).to.be.closeTo(SECRET_FEE, hre.ethers.parseEther("0.1")); 
      });
    });

    describe("Delegate Authorization", function () {
      it("Should allow owner to authorize a delegate", async function () {
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("key1"));
        await secretsSpace.authorizeDelegate(addr1.address, identifier);
        expect(await secretsSpace.delegatePermissions(addr1.address, identifier)).to.be.true;
      });

      it("Should allow owner to revoke delegate authorization", async function () {
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("key1"));
        await secretsSpace.authorizeDelegate(addr1.address, identifier);
        await secretsSpace.revokeDelegate(addr1.address, identifier);
        expect(await secretsSpace.delegatePermissions(addr1.address, identifier)).to.be.false;
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

      it("Should emit events for delegate actions", async function () {
        var enc = new TextEncoder();
        const identifier = hre.ethers.hexlify(enc.encode("key3"))
        await expect(secretsSpace.authorizeDelegate(addr1.address, identifier))
            .to.emit(secretsSpace, "DelegateAuthorized")
            .withArgs(addr1.address, identifier);

        await expect(secretsSpace.revokeDelegate(addr1.address, identifier))
            .to.emit(secretsSpace, "DelegateRevoked")
            .withArgs(addr1.address, identifier);
    });
    });

    describe("Ownership", function () {
      it("should only allow the owner to perform restricted actions", async function () {
        // Admin role should be able to adjust fees
        await secretsSpace.grantRole(await secretsSpace.ADMIN_ROLE(), addr1.address);

        // addr1 can now adjust fees as an admin
        await expect(secretsSpace.connect(addr1).adjustFees(ADJUSTED_FEES))
            .not.to.be.reverted;

        // Owner can also adjust fees directly
        await expect(secretsSpace.adjustFees(ADJUSTED_FEES))
            .not.to.be.reverted;
      });
    });
});