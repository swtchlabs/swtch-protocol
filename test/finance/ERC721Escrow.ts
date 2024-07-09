import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { MockERC721, IdentityManager, ERC721Escrow, ERC721Escrow__factory, IdentityManager__factory } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC721Escrow", function () {
  let identityManager: IdentityManager;

  let mockNFT: MockERC721;
  let erc721Escrow: ERC721Escrow;
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

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.initialize();

    // Registering DIDs
    await identityManager.registerIdentity(owner.address, owner.address, "did:user1DID");
    await identityManager.registerIdentity(depositor.address, depositor.address, "did:user2DID");
    await identityManager.registerIdentity(beneficiary.address, beneficiary.address, "did:beneficiaryDID");
    await identityManager.registerIdentity(arbiter.address, arbiter.address, "did:arbiterDID");

    // Deploy ERC721Escrow
    const ERC721Escrow = await ethers.getContractFactory("ERC721Escrow") as ERC721Escrow__factory;
    erc721Escrow = await ERC721Escrow.connect(depositor).deploy();
    await erc721Escrow.getDeployedCode();
    await erc721Escrow.initialize
    (
      await mockNFT.getAddress(),
      TOKEN_ID,
      depositor.address,
      beneficiary.address,
      arbiter.address,
      await identityManager.getAddress()
    );

  });

  it("should integrate with ERC721 escrow contracts", async function () {
    const escrowAddress = await erc721Escrow.getAddress();

    // Approve ERC721Escrow to transfer user1's NFT
    await mockNFT.connect(depositor).approve(escrowAddress, TOKEN_ID);

    // Deposit NFT
    await erc721Escrow.connect(depositor).deposit();
    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(escrowAddress);

    // Release to beneficiary
    await erc721Escrow.connect(arbiter).releaseToBeneficiary();
    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(beneficiary.address);

    // Set up for refund test
    await mockNFT.connect(beneficiary).transferFrom(beneficiary.address, depositor.address, TOKEN_ID);
    await mockNFT.connect(depositor).approve(escrowAddress, TOKEN_ID);
    await erc721Escrow.connect(depositor).deposit();

    // Refund to depositor
    await erc721Escrow.connect(arbiter).refundToDepositor();
    expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(depositor.address);
  });
});