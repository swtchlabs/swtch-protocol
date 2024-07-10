import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { MockERC721, ReputationManager, ERC721ReputableEscrow } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationManager with ERC721Escrow", function () {
  let reputationSystem: ReputationManager;
  let mockNFT: MockERC721;
  let erc721Escrow: ERC721ReputableEscrow;
  let owner: SignerWithAddress;
  let depositor: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let arbiter: SignerWithAddress;

  const TOKEN_ID = ethers.toBigInt(1);

  beforeEach(async function () {
    [owner, depositor, beneficiary, arbiter] = await ethers.getSigners();

    // Deploy mock ERC721 token
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    mockNFT = await MockERC721.deploy();
    await mockNFT.getDeployedCode();

    // Mint an NFT to user1
    await mockNFT.connect(owner).mint(depositor.address, TOKEN_ID);

    // Deploy ERC721Escrow
    const ERC721Escrow = await ethers.getContractFactory("ERC721ReputableEscrow");
    erc721Escrow = await ERC721Escrow.connect(depositor).deploy();
    await erc721Escrow.getDeployedCode();
    // (address _nft, uint256 _tokenId, address _depositor, address _beneficiary, address _arbiter, address _identityManager)
    await erc721Escrow.initialize
    (
      await mockNFT.getAddress(),
      TOKEN_ID,
      depositor.address,
      beneficiary.address,
      arbiter.address
    );

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
    await erc721Escrow.connect(depositor).setReputationManager(await reputationSystem.getAddress());
  });

  it("should integrate with ERC721 escrow contracts", async function () {
    // Approve ERC721Escrow to transfer user1's NFT
    await mockNFT.connect(depositor).approve(await erc721Escrow.getAddress(), TOKEN_ID);

    // Deposit NFT
    await reputationSystem.connect(depositor).initiateERC721Escrow();

    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(await erc721Escrow.getAddress());

    // Release to beneficiary
    await reputationSystem.connect(owner).releaseERC721Escrow();
    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(beneficiary.address);

    // Set up for refund test
    await mockNFT.connect(beneficiary).transferFrom(beneficiary.address, depositor.address, TOKEN_ID);
    await mockNFT.connect(depositor).approve(await erc721Escrow.getAddress(), TOKEN_ID);
    await reputationSystem.connect(depositor).initiateERC721Escrow();

    // Refund to depositor
    await reputationSystem.connect(owner).refundERC721Escrow();
    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(depositor.address);
  });
});