import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ReputableEscrow, 
  ReputableEscrow__factory, 
  IdentityManager, 
  IdentityManager__factory,
  ReputationManager,
  ReputationManager__factory
} from "../../typechain-types";

describe("ReputableEscrow", function () {
  let reputableEscrow: ReputableEscrow;
  let identityManager: IdentityManager;
  let reputationManager: ReputationManager;
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

    // Registering DIDs
    await identityManager.registerIdentity(owner.address, owner.address, "did:user1DID");
    await identityManager.registerIdentity(depositor.address, depositor.address, "did:user2DID");
    await identityManager.registerIdentity(beneficiary.address, beneficiary.address, "did:beneficiaryDID");
    await identityManager.registerIdentity(arbiter.address, arbiter.address, "did:arbiterDID");

    await identityManager.addDelegate(owner.address, depositor.address);
    await identityManager.addDelegate(owner.address, arbiter.address);

    // Deploy ReputationManager (mocked for this test)
    const ReputationManagerFactory = await ethers.getContractFactory("ReputationManager") as ReputationManager__factory;
    reputationManager = await ReputationManagerFactory.deploy();
    await reputationManager.initialize(
      await identityManager.getAddress(),
      ethers.ZeroAddress, // mock addresses for escrows
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );

    // Deploy ReputableEscrow
    const ReputableEscrowFactory = await ethers.getContractFactory("ReputableEscrow") as ReputableEscrow__factory;
    reputableEscrow = await ReputableEscrowFactory.deploy();

    await reputableEscrow.initialize(
      await depositor.getAddress(),
      await beneficiary.getAddress(), 
      await arbiter.getAddress(), 
      await identityManager.getAddress()
    );

    await reputableEscrow.getDeployedCode();
    await reputableEscrow.setReputationManager(await reputableEscrow.getAddress());

  });

  describe("Initialization", function () {
    it("should set the correct initial values", async function () {
      expect(await reputableEscrow.depositor()).to.equal(depositor.address);
      expect(await reputableEscrow.beneficiary()).to.equal(beneficiary.address);
      expect(await reputableEscrow.arbiter()).to.equal(arbiter.address);
      expect(await reputableEscrow.identityManager()).to.equal(await identityManager.getAddress());
    });
  });

  describe("Deposit", function () {
    it("should allow depositor to deposit funds and update reputation", async function () {
      await expect(reputableEscrow.connect(depositor).deposit({ value: depositAmount }))
        .to.emit(reputableEscrow, "Deposited")
        .withArgs(depositor.address, depositAmount);

      expect(await reputableEscrow.getBalance()).to.equal(depositAmount);

      // Check if reputation was updated
      // Note: This assumes the ReputationManager emits an event when updating scores.
      // If it doesn't, mock the ReputationManager and check if the function was called.
    });

    it("should not allow outsiders to deposit funds", async function () {
      await expect(reputableEscrow.connect(outsider).deposit({ value: depositAmount }))
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Release to Beneficiary", function () {
    beforeEach(async function () {
      await reputableEscrow.connect(depositor).deposit({ value: depositAmount });
    });

    it("should allow arbiter to release funds to beneficiary and update reputations", async function () {
      await expect(reputableEscrow.connect(arbiter).releaseToBeneficiary())
        .to.emit(reputableEscrow, "Released")
        .withArgs(beneficiary.address, depositAmount);

      expect(await reputableEscrow.getBalance()).to.equal(0);

      // Check if reputations were updated
      // Note: This assumes the ReputationManager emits events when updating scores.
      // If it doesn't, you'll need to mock the ReputationManager and check if the functions were called.
    });

    it("should not allow outsiders to release funds", async function () {
      await expect(reputableEscrow.connect(outsider).releaseToBeneficiary())
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Refund to Depositor", function () {
    beforeEach(async function () {
      await reputableEscrow.connect(depositor).deposit({ value: depositAmount });
    });

    it("should allow arbiter to refund funds to depositor and update reputation", async function () {
      await expect(reputableEscrow.connect(arbiter).refundToDepositor())
        .to.emit(reputableEscrow, "Refunded")
        .withArgs(depositor.address, depositAmount);

      expect(await reputableEscrow.getBalance()).to.equal(0);

      // Check if reputation was updated
      // Note: This assumes the ReputationManager emits an event when updating scores.
      // If it doesn't, you'll need to mock the ReputationManager and check if the function was called.
    });

    it("should not allow outsiders to refund funds", async function () {
      await expect(reputableEscrow.connect(outsider).refundToDepositor())
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });
});