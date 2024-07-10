import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ERC1155ProofOfFunds,
  ERC1155ProofOfFunds__factory,
  IdentityManager,
  IdentityManager__factory,
  MockERC1155,
  MockERC1155__factory
} from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC1155ProofOfFunds", function () {
  let erc1155ProofOfFunds: ERC1155ProofOfFunds;
  let identityManager: IdentityManager;
  let mockERC1155: MockERC1155;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let outsider: SignerWithAddress;

  const tokenId = 1;
  const amount = 100;

  beforeEach(async function () {
    [owner, user, outsider] = await ethers.getSigners();

    // Deploy MockERC1155
    const MockERC1155Factory = await ethers.getContractFactory("MockERC1155") as MockERC1155__factory;
    mockERC1155 = await MockERC1155Factory.deploy("https://token-uri.com/");
    await mockERC1155.getDeployedCode();

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.getDeployedCode();
    await identityManager.initialize();

    // Register identities
    await identityManager.registerIdentity(owner.address, owner.address, "did:owner");
    await identityManager.registerIdentity(user.address, user.address, "did:user");

    // Deploy ERC1155ProofOfFunds
    const ERC1155ProofOfFundsFactory = await ethers.getContractFactory("ERC1155ProofOfFunds") as ERC1155ProofOfFunds__factory;
    erc1155ProofOfFunds = await ERC1155ProofOfFundsFactory.deploy();
    await erc1155ProofOfFunds.getDeployedCode();
    await erc1155ProofOfFunds.initialize(await mockERC1155.getAddress(), await identityManager.getAddress());

    // Mint ERC1155 tokens to owner
    await mockERC1155.mint(owner.address, tokenId, amount, "0x");
    await mockERC1155.connect(owner).setApprovalForAll(await erc1155ProofOfFunds.getAddress(), true);
  });

  describe("Deposit", function () {
    it("should allow owner to deposit ERC1155 tokens", async function () {
      await expect(erc1155ProofOfFunds.connect(owner).deposit(tokenId, amount))
        .to.emit(erc1155ProofOfFunds, "Deposited")
        .withArgs(owner.address, tokenId, amount);

      expect(await erc1155ProofOfFunds.getBalance(tokenId)).to.equal(amount);
    });

    it("should not allow deposit of zero amount", async function () {
      await expect(erc1155ProofOfFunds.connect(owner).deposit(tokenId, 0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("should not allow non-owners to deposit tokens", async function () {
      await expect(erc1155ProofOfFunds.connect(outsider).deposit(tokenId, amount))
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Create Proof", function () {
    beforeEach(async function () {
      await erc1155ProofOfFunds.connect(owner).deposit(tokenId, amount);
    });

    it("should allow owner to create a proof", async function () {
      const duration = 3600; // 1 hour
      const tx = await erc1155ProofOfFunds.connect(owner).createProof(tokenId, amount, duration);
      const receipt = await tx.wait();
      const event:any = receipt?.logs.find((log:any) => log.fragment.name === 'ProofCreated');
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
      expect(event?.args?.amount).to.equal(amount);
    });

    it("should not allow creation of proof for insufficient balance", async function () {
      const duration = 3600;
      await expect(erc1155ProofOfFunds.connect(owner).createProof(tokenId, amount + 1, duration))
        .to.be.revertedWith("Insufficient tokens in contract");
    });
  });

  describe("Use Proof", function () {
    let proofId: string;

    beforeEach(async function () {
      await erc1155ProofOfFunds.connect(owner).deposit(tokenId, amount);
      const duration = 3600;
      const tx = await erc1155ProofOfFunds.connect(owner).createProof(tokenId, amount, duration);
      const receipt = await tx.wait();
      const event:any = receipt?.logs.find((log:any) => log.fragment.name === 'ProofCreated');
      proofId = event?.args?.[0];
    });

    it("should allow a user to use a valid proof", async function () {
      await expect(erc1155ProofOfFunds.connect(user).useProof(proofId))
        .to.emit(erc1155ProofOfFunds, "ProofUsed")
        .withArgs(proofId, user.address);
    });

    it("should not allow using an expired proof", async function () {
      await time.increase(3601); // Increase time by more than 1 hour
      await expect(erc1155ProofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has expired");
    });

    it("should not allow using a proof twice", async function () {
      await erc1155ProofOfFunds.connect(user).useProof(proofId);
      await expect(erc1155ProofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has already been used");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      await erc1155ProofOfFunds.connect(owner).deposit(tokenId, amount);
    });

    it("should allow owner to withdraw ERC1155 tokens", async function () {
      await expect(erc1155ProofOfFunds.connect(owner).withdraw(tokenId, amount))
        .to.emit(erc1155ProofOfFunds, "Withdrawn")
        .withArgs(owner.address, tokenId, amount);

      expect(await erc1155ProofOfFunds.getBalance(tokenId)).to.equal(0);
    });

    it("should not allow withdrawing more than the balance", async function () {
      await expect(erc1155ProofOfFunds.connect(owner).withdraw(tokenId, amount + 1))
        .to.be.revertedWith("Insufficient tokens in contract");
    });

    it("should not allow non-owners to withdraw", async function () {
      await expect(erc1155ProofOfFunds.connect(outsider).withdraw(tokenId, amount))
        .to.be.revertedWithCustomError(erc1155ProofOfFunds, "OwnableUnauthorizedAccount")
        .withArgs(outsider.address);
    });
  });

  describe("GetBalance", function () {
    it("should return correct balance for deposited tokens", async function () {
      await erc1155ProofOfFunds.connect(owner).deposit(tokenId, amount);
      expect(await erc1155ProofOfFunds.getBalance(tokenId)).to.equal(amount);
    });

    it("should return zero for non-deposited tokens", async function () {
      expect(await erc1155ProofOfFunds.getBalance(tokenId + 1)).to.equal(0);
    });
  });
});