import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  Escrow, 
  Escrow__factory, 
  IdentityManager, 
  IdentityManager__factory
} from "../../typechain-types";

describe("Escrow", function () {
  let escrow: Escrow;
  let identityManager: IdentityManager;
  let owner: SignerWithAddress;
  let depositor: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let arbiter: SignerWithAddress;
  let outsider: SignerWithAddress;

  const depositAmount = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, depositor, beneficiary, arbiter, outsider] = await ethers.getSigners();

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.initialize();

    // Register identities
    await identityManager.registerIdentity(depositor.address, depositor.address, "did:depositor");
    await identityManager.registerIdentity(arbiter.address, arbiter.address, "did:arbiter");

    // Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("Escrow") as Escrow__factory;
    escrow = await EscrowFactory.deploy();
    await escrow.initialize(
      depositor.address,
      beneficiary.address, 
      arbiter.address, 
      await identityManager.getAddress()
    );
  });

  describe("Initialization", function () {
    it("should set the correct initial values", async function () {
      expect(await escrow.depositor()).to.equal(depositor.address);
      expect(await escrow.beneficiary()).to.equal(beneficiary.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
      expect(await escrow.identityManager()).to.equal(await identityManager.getAddress());
    });
  });

  describe("Deposit", function () {
    it("should allow depositor to deposit funds", async function () {
      await expect(escrow.connect(depositor).deposit({ value: depositAmount }))
        .to.emit(escrow, "Deposited")
        .withArgs(depositor.address, depositAmount);

      expect(await escrow.getBalance()).to.equal(depositAmount);
    });

    it("should not allow non-depositors to deposit funds", async function () {
      await expect(escrow.connect(outsider).deposit({ value: depositAmount }))
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Release to Beneficiary", function () {
    beforeEach(async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
    });

    it("should allow arbiter to release funds to beneficiary", async function () {
      const initialBeneficiaryBalance = await ethers.provider.getBalance(beneficiary.address);

      await expect(escrow.connect(arbiter).releaseToBeneficiary())
        .to.emit(escrow, "Released")
        .withArgs(beneficiary.address, depositAmount);

      expect(await escrow.getBalance()).to.equal(0);

      const finalBeneficiaryBalance = await ethers.provider.getBalance(beneficiary.address);
      expect(finalBeneficiaryBalance - initialBeneficiaryBalance).to.equal(depositAmount);
    });

    it("should not allow non-arbiters to release funds", async function () {
      await expect(escrow.connect(outsider).releaseToBeneficiary())
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Refund to Depositor", function () {
    beforeEach(async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
    });

    it("should allow arbiter to refund funds to depositor", async function () {
      const initialDepositorBalance = await ethers.provider.getBalance(depositor.address);

      await expect(escrow.connect(arbiter).refundToDepositor())
        .to.emit(escrow, "Refunded")
        .withArgs(depositor.address, depositAmount);

      expect(await escrow.getBalance()).to.equal(0);

      const finalDepositorBalance = await ethers.provider.getBalance(depositor.address);
      expect(finalDepositorBalance - initialDepositorBalance).to.be.closeTo(depositAmount, ethers.parseEther("0.001")); // Allow for gas costs
    });

    it("should not allow non-arbiters to refund funds", async function () {
      await expect(escrow.connect(outsider).refundToDepositor())
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Get Balance", function () {
    it("should return the correct balance", async function () {
      expect(await escrow.getBalance()).to.equal(0);

      await escrow.connect(depositor).deposit({ value: depositAmount });

      expect(await escrow.getBalance()).to.equal(depositAmount);
    });
  });
});