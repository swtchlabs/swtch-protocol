import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ERC721ProofOfFunds,
  ERC721ProofOfFunds__factory,
  IdentityManager,
  IdentityManager__factory,
  MockERC721,
  MockERC721__factory
} from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC721ProofOfFunds", function () {
  let erc721ProofOfFunds: ERC721ProofOfFunds;
  let identityManager: IdentityManager;
  let mockNFT: MockERC721;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let outsider: SignerWithAddress;

  const tokenId = ethers.toBigInt(111);
  
  beforeEach(async function () {
    [owner, user, outsider] = await ethers.getSigners();

    // Deploy MockERC721
    const MockERC721Factory = await ethers.getContractFactory("MockERC721") as MockERC721__factory;
    mockNFT = await MockERC721Factory.deploy();
    await mockNFT.getDeployedCode();

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.getDeployedCode();
    await identityManager.initialize();

    // Register identities
    await identityManager.registerIdentity(owner.address, owner.address, "did:owner");
    await identityManager.registerIdentity(user.address, user.address, "did:user");

    // Deploy ERC721ProofOfFunds
    const ERC721ProofOfFundsFactory = await ethers.getContractFactory("ERC721ProofOfFunds") as ERC721ProofOfFunds__factory;
    erc721ProofOfFunds = await ERC721ProofOfFundsFactory.deploy();
    await erc721ProofOfFunds.getDeployedCode();
    await erc721ProofOfFunds.initialize(await mockNFT.getAddress(), await identityManager.getAddress());

    // Mint NFT to owner
    await mockNFT.mint(owner.address, tokenId);
    await mockNFT.connect(owner).approve(await erc721ProofOfFunds.getAddress(), tokenId);
  });

  describe("Deposit", function () {
    it("should allow owner to deposit NFT", async function () {
      await expect(erc721ProofOfFunds.connect(owner).deposit(tokenId))
        .to.emit(erc721ProofOfFunds, "Deposited")
        .withArgs(owner.address, tokenId);

      expect(await erc721ProofOfFunds.isTokenDeposited(tokenId)).to.be.true;
    });

    it("should not allow non-owners to deposit NFT", async function () {
      await expect(erc721ProofOfFunds.connect(outsider).deposit(tokenId))
        .to.be.revertedWith("Unauthorized: caller is not the owner or delegate");
    });
  });

  describe("Create Proof", function () {
    beforeEach(async function () {
      await erc721ProofOfFunds.connect(owner).deposit(tokenId);
    });

    it("should allow owner to create a proof", async function () {
      const duration = 3600; // 1 hour
      const tx = await erc721ProofOfFunds.connect(owner).createProof(tokenId, duration);
      const receipt = await tx.wait();
      const event:any = receipt?.logs.find((log:any) => log.fragment.name === 'ProofCreated');
      expect(event).to.not.be.undefined;
      expect(event?.args?.tokenId).to.equal(tokenId);
    });

    it("should not allow creation of proof for non-deposited token", async function () {
      const nonDepositedTokenId = 2;
      await mockNFT.mint(owner.address, nonDepositedTokenId);
      const duration = 3600;
      await expect(erc721ProofOfFunds.connect(owner).createProof(nonDepositedTokenId, duration))
        .to.be.revertedWith("Token not deposited in contract");
    });
  });

  describe("Use Proof", function () {
    let proofId: string;

    beforeEach(async function () {
      await erc721ProofOfFunds.connect(owner).deposit(tokenId);
      const duration = 3600;
      const tx = await erc721ProofOfFunds.connect(owner).createProof(tokenId, duration);
      const receipt = await tx.wait();
      const event:any = receipt?.logs.find((log:any) => log.fragment.name === 'ProofCreated');
      proofId = event?.args?.[0];
    });

    it("should allow a user to use a valid proof", async function () {
      await expect(erc721ProofOfFunds.connect(user).useProof(proofId))
        .to.emit(erc721ProofOfFunds, "ProofUsed")
        .withArgs(proofId, user.address);
    });

    it("should not allow using an expired proof", async function () {
      await time.increase(3601); // Increase time by more than 1 hour
      await expect(erc721ProofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has expired");
    });

    it("should not allow using a proof twice", async function () {
      await erc721ProofOfFunds.connect(user).useProof(proofId);
      await expect(erc721ProofOfFunds.connect(user).useProof(proofId))
        .to.be.revertedWith("Proof has already been used");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      await erc721ProofOfFunds.connect(owner).deposit(tokenId);
    });

    it("should allow owner to withdraw NFT", async function () {
      await expect(erc721ProofOfFunds.connect(owner).withdraw(tokenId))
        .to.emit(erc721ProofOfFunds, "Withdrawn")
        .withArgs(owner.address, tokenId);

      expect(await erc721ProofOfFunds.isTokenDeposited(tokenId)).to.be.false;
    });

    it("should not allow withdrawing a non-deposited token", async function () {
      const nonDepositedTokenId = 2;
      await mockNFT.mint(owner.address, nonDepositedTokenId);
      await expect(erc721ProofOfFunds.connect(owner).withdraw(nonDepositedTokenId))
        .to.be.revertedWith("Token not owned by contract");
    });

    it("should not allow non-owners to withdraw", async function () {
      await expect(erc721ProofOfFunds.connect(outsider).withdraw(tokenId))
        .to.be.revertedWithCustomError(erc721ProofOfFunds, "OwnableUnauthorizedAccount")
        .withArgs(outsider.address);
    });
  });

  describe("IsTokenDeposited", function () {
    it("should return true for deposited token", async function () {
      await erc721ProofOfFunds.connect(owner).deposit(tokenId);
      expect(await erc721ProofOfFunds.isTokenDeposited(tokenId)).to.be.true;
    });

    it("should return false for non-deposited token", async function () {
      expect(await erc721ProofOfFunds.isTokenDeposited(tokenId)).to.be.false;
    });
  });
});