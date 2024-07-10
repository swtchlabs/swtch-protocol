import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ERC20ProofOfFunds,
  ERC20ProofOfFunds__factory,
  IdentityManager,
  IdentityManager__factory,
  MockERC20,
  MockERC20__factory
} from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC20ProofOfFunds", function () {
  let erc20ProofOfFunds: ERC20ProofOfFunds;
  let identityManager: IdentityManager;
  let mockToken: MockERC20;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let outsider: SignerWithAddress;
  
  const TOTAL_SUPPLY = ethers.toBigInt(100000000);
  const depositAmount = ethers.parseUnits("1000", 18);
  const proofAmount = ethers.parseUnits("500", 18);

  beforeEach(async function () {
    [owner, user, outsider] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20") as MockERC20__factory;
    mockToken = await MockERC20Factory.deploy(TOTAL_SUPPLY);

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.initialize();

    // Register identities
    await identityManager.registerIdentity(owner.address, owner.address, "did:owner");
    await identityManager.registerIdentity(user.address, user.address, "did:user");

    // Deploy ERC20ProofOfFunds
    const ERC20ProofOfFundsFactory = await ethers.getContractFactory("ERC20ProofOfFunds") as ERC20ProofOfFunds__factory;
    erc20ProofOfFunds = await ERC20ProofOfFundsFactory.deploy();
    await erc20ProofOfFunds.initialize(await mockToken.getAddress(), await identityManager.getAddress());

    // Mint tokens to owner and approve ERC20ProofOfFunds contract
    await mockToken.mint(owner.address, depositAmount);
    await mockToken.connect(owner).approve(await erc20ProofOfFunds.getAddress(), depositAmount);

    // Deposit tokens
    await erc20ProofOfFunds.connect(owner).deposit(depositAmount);
  });

  describe("Deposit", function () {
    it("should allow owner to deposit tokens", async function () {
      const additionalDeposit = ethers.parseUnits("500", 18);
      await mockToken.mint(owner.address, additionalDeposit);
      await mockToken.connect(owner).approve(await erc20ProofOfFunds.getAddress(), additionalDeposit);

      await expect(erc20ProofOfFunds.connect(owner).deposit(additionalDeposit))
        .to.emit(erc20ProofOfFunds, "Deposited")
        .withArgs(owner.address, additionalDeposit);

      expect(await erc20ProofOfFunds.getBalance()).to.equal(depositAmount + additionalDeposit);
    });

    it("should not allow non-owners to deposit tokens", async function () {
      await expect(erc20ProofOfFunds.connect(outsider).deposit(depositAmount))
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Create Proof", function () {
    it("should allow owner to create a proof", async function () {
      const duration = 3600; // 1 hour
      const tx = await erc20ProofOfFunds.connect(owner).createProof(proofAmount, duration);
      const receipt = await tx.wait();
      const event:any = receipt?.logs.find((log:any) => log.fragment.name === 'ProofCreated');
      expect(event).to.not.be.undefined;
      expect(event?.args?.amount).to.equal(proofAmount);
    });

    it("should not allow creation of proof for amount greater than balance", async function () {
      const duration = 3600;
      await expect(erc20ProofOfFunds.connect(owner).createProof(depositAmount + ethers.toBigInt(1), duration))
        .to.be.revertedWith("Insufficient funds in contract");
    });
  });

  describe("Use Proof", function () {
    let proofId: string;

    beforeEach(async function () {
      const duration = 3600;
      const tx = await erc20ProofOfFunds.connect(owner).createProof(proofAmount, duration);
      const receipt = await tx.wait();
      const event:any = receipt?.logs.find((log:any) => log.fragment.name === 'ProofCreated');
      proofId = event?.args?.[0];
    });

    it("should allow a user to use a valid proof", async function () {
      await expect(erc20ProofOfFunds.connect(user).useProof(proofId))
        .to.emit(erc20ProofOfFunds, "ProofUsed")
        .withArgs(proofId, user.address);
    });

    it("should not allow using an expired proof", async function () {
      await time.increase(3601); // Increase time by more than 1 hour
      await expect(erc20ProofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has expired");
    });

    it("should not allow using a proof twice", async function () {
      await erc20ProofOfFunds.connect(user).useProof(proofId);
      await expect(erc20ProofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has already been used");
    });
  });

  describe("Withdraw", function () {
    it("should allow owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseUnits("200", 18);
      await expect(erc20ProofOfFunds.connect(owner).withdraw(withdrawAmount))
        .to.emit(erc20ProofOfFunds, "Withdrawn")
        .withArgs(owner.address, withdrawAmount);

      expect(await erc20ProofOfFunds.getBalance()).to.equal(depositAmount - withdrawAmount);
    });

    it("should not allow withdrawing more than the balance", async function () {
      const excessAmount = depositAmount + ethers.toBigInt(1);
      await expect(erc20ProofOfFunds.connect(owner).withdraw(excessAmount))
        .to.be.revertedWith("Insufficient funds in contract");
    });

    it("should not allow non-owners to withdraw", async function () {
      await expect(erc20ProofOfFunds.connect(outsider).withdraw(ethers.parseUnits("100", 18)))
        .to.be.revertedWithCustomError(erc20ProofOfFunds, "OwnableUnauthorizedAccount")
        .withArgs(outsider.address);
    });
  });
});