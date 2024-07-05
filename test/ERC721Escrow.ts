import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { MockERC721, ERC721Escrow, ReputationManager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationManager with ERC721Escrow", function () {
  let reputationSystem: ReputationManager;
  let mockNFT: MockERC721;
  let erc721Escrow: ERC721Escrow;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let arbiter: SignerWithAddress;

  const TOKEN_ID = 1;

  beforeEach(async function () {
    [owner, user1, beneficiary, arbiter] = await ethers.getSigners();

    // Deploy mock ERC721 token
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    mockNFT = await MockERC721.deploy();
    await mockNFT.getDeployedCode();

    // Mint an NFT to user1
    await mockNFT.connect(owner).mint(user1.address, TOKEN_ID);

    // Deploy ERC721Escrow
    const ERC721Escrow = await ethers.getContractFactory("ERC721Escrow");
    erc721Escrow = await ERC721Escrow.connect(user1).deploy(
      await mockNFT.getAddress(),
      TOKEN_ID,
      beneficiary.address,
      arbiter.address
    );
    await erc721Escrow.getDeployedCode();

    // Deploy ReputationManager
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    reputationSystem = await upgrades.deployProxy(ReputationManager, [
      ethers.ZeroAddress, // not testing IdentityManager here
      ethers.ZeroAddress, // not testing regular Escrow here
      ethers.ZeroAddress, // not testing ERC20Escrow here
      await erc721Escrow.getAddress()
    ]) as any;
    await reputationSystem.getDeployedCode();

    // Set ReputationManager in ERC721Escrow
    await erc721Escrow.connect(user1).setReputationManager(await reputationSystem.getAddress());
  });

  it("should integrate with ERC721 escrow contracts", async function () {
    // Approve ERC721Escrow to transfer user1's NFT
    await mockNFT.connect(user1).approve(await erc721Escrow.getAddress(), TOKEN_ID);

    // Deposit NFT
    await reputationSystem.connect(user1).initiateERC721Escrow();

    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(await erc721Escrow.getAddress());

    // Release to beneficiary
    await reputationSystem.connect(owner).releaseERC721Escrow();
    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(beneficiary.address);

    // Set up for refund test
    await mockNFT.connect(beneficiary).transferFrom(beneficiary.address, user1.address, TOKEN_ID);
    await mockNFT.connect(user1).approve(await erc721Escrow.getAddress(), TOKEN_ID);
    await reputationSystem.connect(user1).initiateERC721Escrow();

    // Refund to depositor
    await reputationSystem.connect(owner).refundERC721Escrow();
    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(user1.address);
  });
});