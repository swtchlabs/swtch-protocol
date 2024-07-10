import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ProofOfFunds,
  ProofOfFunds__factory,
  IdentityManager,
  IdentityManager__factory
} from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ProofOfFunds", function () {
  let proofOfFunds: ProofOfFunds;
  let identityManager: IdentityManager;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let outsider: SignerWithAddress;

  const depositAmount = ethers.parseEther("10");
  const proofAmount = ethers.parseEther("5");

  beforeEach(async function () {
    [owner, user, outsider] = await ethers.getSigners();

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.getDeployedCode();
    await identityManager.initialize();

    // Register identities
    await identityManager.registerIdentity(owner.address, owner.address, "did:owner");
    await identityManager.registerIdentity(user.address, user.address, "did:user");

    // Deploy ProofOfFunds
    const ProofOfFundsFactory = await ethers.getContractFactory("ProofOfFunds") as ProofOfFunds__factory;
    proofOfFunds = await ProofOfFundsFactory.deploy();
    await proofOfFunds.initialize(await identityManager.getAddress());

    // Deposit funds
    await proofOfFunds.connect(owner).deposit({ value: depositAmount });
  });

  describe("Deposit", function () {

    it("should allow owner to deposit funds and change balance", async function () {
        const additionalDeposit = ethers.parseEther("5");
        await expect(proofOfFunds.connect(owner).deposit({ value: additionalDeposit }))
          .to.changeEtherBalance(proofOfFunds, additionalDeposit);
      });
    
      it("should emit Deposited event when owner deposits funds", async function () {
        const additionalDeposit = ethers.parseEther("5");
        await expect(proofOfFunds.connect(owner).deposit({ value: additionalDeposit }))
          .to.emit(proofOfFunds, "Deposited")
          .withArgs(owner.address, additionalDeposit);
      });
    
      it("should not allow non-owners to deposit funds", async function () {
        await expect(proofOfFunds.connect(outsider).deposit({ value: ethers.parseEther("1") }))
          .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
      });
  });

  describe("Create Proof", function () {
    it("should allow owner to create a proof", async function () {
      const duration = 3600; // 1 hour
      await expect(proofOfFunds.connect(owner).createProof(proofAmount, duration))
        .to.emit(proofOfFunds, "ProofCreated");
    });

    it("should not allow creation of proof for amount greater than balance", async function () {
      const duration = 3600;
      await expect(proofOfFunds.connect(owner).createProof(depositAmount+ethers.toBigInt(1), duration))
        .to.be.revertedWith("Insufficient funds in contract");
    });
  });

  describe("Use Proof", function () {
    let proofId: string;

    beforeEach(async function () {
      const duration = 3600;
      const tx = await proofOfFunds.connect(owner).createProof(proofAmount, duration);
      const receipt = await tx.wait();
      const event:any = receipt?.logs.find((log:any) => log.fragment.name === 'ProofCreated');
      proofId = event?.args?.[0];
    });

    it("should allow a user to use a valid proof", async function () {
      await expect(proofOfFunds.connect(user).useProof(proofId))
        .to.emit(proofOfFunds, "ProofUsed")
        .withArgs(proofId, user.address);
    });

    it("should not allow using an expired proof", async function () {
      await time.increase(3601); // Increase time by more than 1 hour
      await expect(proofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has expired");
    });

    it("should not allow using a proof twice", async function () {
      await proofOfFunds.connect(user).useProof(proofId);
      await expect(proofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has already been used");
    });
  });

  describe("Withdraw", function () {
    it("should allow owner to withdraw funds and change balances", async function () {
        const withdrawAmount = ethers.parseEther("2");
        await expect(proofOfFunds.connect(owner).withdraw(withdrawAmount))
          .to.changeEtherBalances([proofOfFunds, owner], [withdrawAmount* ethers.toBigInt(-1), withdrawAmount]);
      });
    
      it("should emit Withdrawn event when owner withdraws funds", async function () {
        const withdrawAmount = ethers.parseEther("2");
        await expect(proofOfFunds.connect(owner).withdraw(withdrawAmount))
          .to.emit(proofOfFunds, "Withdrawn")
          .withArgs(owner.address, withdrawAmount);
      });
    
      it("should not allow withdrawing more than the balance", async function () {
        const excessAmount = depositAmount+ethers.toBigInt(1);
        await expect(proofOfFunds.connect(owner).withdraw(excessAmount))
          .to.be.revertedWith("Insufficient funds in contract");
      });
    
      it("should not allow non-owners to withdraw", async function () {
        await expect(proofOfFunds.connect(outsider).withdraw(ethers.parseEther("1")))
          .to.be.revertedWithCustomError(proofOfFunds, "OwnableUnauthorizedAccount")
          .withArgs(outsider.address);
      });
  });
});