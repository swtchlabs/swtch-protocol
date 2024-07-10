import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ERC20Escrow, ERC20Escrow__factory, ERC721Escrow, ERC721Escrow__factory, Escrow, Escrow__factory, IdentityManager, IdentityManager__factory, ReputationManager, SWTCH__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationManager", function () {
  let reputationSystem: any;
  let identityManager: IdentityManager;
  let mockToken: any;
  let ethEscrow: Escrow;
  let erc20Escrow: ERC20Escrow;
  let erc721Escrow: ERC721Escrow;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let arbiter: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000000", 18);
  const DEPOSIT_AMOUNT = ethers.parseUnits("1000", 18);

  beforeEach(async function () {
    [owner, user1, user2, beneficiary, arbiter, unauthorized] = await ethers.getSigners();

    // Deploy mock contracts
    const IdentityManager = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManager.deploy();
    await identityManager.getDeployedCode();
    await identityManager.initialize();

    // Registering DIDs
    await identityManager.registerIdentity(user1.address, user1.address, "did:user1DID");
    await identityManager.registerIdentity(user2.address, user2.address, "did:user2DID");
    await identityManager.registerIdentity(beneficiary.address, beneficiary.address, "did:beneficiaryDID");
    await identityManager.registerIdentity(arbiter.address, arbiter.address, "did:arbiterDID");

    const Escrow = await ethers.getContractFactory("Escrow") as Escrow__factory;
    ethEscrow = await Escrow.deploy(beneficiary.address, arbiter.address);

    // Deploy ERC20 and provide for the ERC20 Escrow
    const Token = await ethers.getContractFactory("SimpleERC20", owner);
    mockToken = await Token.deploy(INITIAL_SUPPLY);
    await mockToken.getDeployedCode();
    const erc20TokenAddress = await mockToken.getAddress();

    // Deploy ERC20 and provide for the ERC20 Escrow
    const ERC20Escrow = await ethers.getContractFactory("ERC20Escrow") as ERC20Escrow__factory;
    erc20Escrow = await ERC20Escrow.deploy(erc20TokenAddress, beneficiary.address, arbiter.address) as ERC20Escrow;
    await erc20Escrow.getDeployedCode();
    
    // Deploy ERC721 
    const nft = ethers.ZeroAddress;
    const tokenId = ethers.toBigInt(1); 
    const ERC721Escrow = await ethers.getContractFactory("ERC721Escrow") as ERC721Escrow__factory;
    erc721Escrow = await ERC721Escrow.deploy(nft, tokenId, beneficiary.address, arbiter.address);

    // Deploy ReputationManager
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    reputationSystem = await upgrades.deployProxy(ReputationManager, [
      await identityManager.getAddress(),
      await ethEscrow.getAddress(),
      await erc20Escrow.getAddress(),
      await erc721Escrow.getAddress()
    ]);

    await reputationSystem.getDeployedCode();

    // Set ReputationManager in ERC20Escrow
    await erc20Escrow.connect(owner).setReputationManager(await reputationSystem.getAddress());

    // Transfer some tokens to user1 for testing
    await mockToken.connect(owner).transfer(await user1.getAddress(), DEPOSIT_AMOUNT);
    await mockToken.connect(owner).transfer(await reputationSystem.getAddress(), DEPOSIT_AMOUNT);
    
  });

  it("should initialize correctly", async function () {
    expect(await reputationSystem.identityManager()).to.equal(await identityManager.getAddress());
    expect(await reputationSystem.ethEscrow()).to.equal(await ethEscrow.getAddress());
    expect(await reputationSystem.erc20Escrow()).to.equal(await erc20Escrow.getAddress());
    expect(await reputationSystem.erc721Escrow()).to.equal(await erc721Escrow.getAddress());
  });

  it("should update score correctly", async function () {
    const user1Address = await user1.getAddress();

    await reputationSystem.connect(owner).setActionWeight(user1Address, ethers.id("ACTION1"), 100);
    await reputationSystem.connect(user1).updateScore(user1Address, false, ethers.id("ACTION1"), true);

    const [consumerScore, ,] = await reputationSystem.getCompleteProfile(user1Address);
    expect(consumerScore).to.equal(100);
  });

  it("should apply score decay", async function () {
    const user1Address = await user1.getAddress();

    await reputationSystem.connect(owner).setActionWeight(user1Address, ethers.id("ACTION1"), 1000);
    await reputationSystem.connect(user1).updateScore(user1Address, false, ethers.id("ACTION1"), true);

    // Move time forward by 30 days
    await time.increase(30 * 24 * 60 * 60);

    const [consumerScore, ,] = await reputationSystem.getCompleteProfile(user1Address);
    expect(consumerScore).to.equal(950); // 95% of 1000
  });

  it("should update product score", async function () {
    const user1Address = await user1.getAddress();
    
    const productHash = ethers.id("PRODUCT1");
    await reputationSystem.connect(user1).updateProductScore(user1Address, productHash, 8000);

    const productScore = await reputationSystem.getProductScore(user1Address, productHash);
    expect(productScore).to.equal(8000);
  });

  it("should not allow unauthorized score updates", async function () {
    const user1Address = await user1.getAddress();
    await expect(
      reputationSystem.connect(unauthorized).updateScore(user1Address, false, ethers.id("ACTION1"), true)
    ).to.be.revertedWith("Not authorized for this DID");
  });

  it("should allow owner to set action weights", async function () {
    const user1Address = await user1.getAddress();
    const actionType = ethers.id("ACTION1");
    
    await reputationSystem.connect(owner).setActionWeight(user1Address, actionType, 200);
    
    // We don't have a direct way to check the action weight, 
    // so we'll update the score and check the result
    await reputationSystem.connect(user1).updateScore(user1Address, false, actionType, true);

    const [consumerScore, ,] = await reputationSystem.getCompleteProfile(user1Address);
    expect(consumerScore).to.equal(200);
  });

  it("should integrate with Ether escrow contracts", async function () {

    // Set the ReputationManager address in the Escrow contract
    // await ethEscrow.connect(owner).setReputationManager(await reputationSystem.getAddress());

    const amount = ethers.parseEther("10");
    await reputationSystem.connect(owner).initiateEscrow({value: amount});

    expect(await ethEscrow.getBalance()).to.equal(amount);

    // Release to beneficiary
    const beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiary.address);
    await reputationSystem.connect(owner).releaseEscrow();
    const beneficiaryBalanceAfter = await ethers.provider.getBalance(beneficiary.address);
    expect(beneficiaryBalanceAfter).to.equal(beneficiaryBalanceBefore + amount);
    expect(await ethEscrow.getBalance()).to.equal(0);

    // Refund to depositor (this won't actually transfer any funds since the escrow is now empty)
    await reputationSystem.connect(owner).refundEscrow();
    expect(await ethEscrow.getBalance()).to.equal(0);
  });

  /**
   * Setup ensures:
   * Users only need to approve the ReputationManager to spend their tokens.
   * The ReputationManager handles the transfer of tokens to the ERC20Escrow contract.
   * The ERC20Escrow contract only allows the ReputationManager to call its functions.
   * The original depositor is tracked in the ERC20Escrow contract for refunds.
   */
  it("should integrate with ERC20 escrow contracts", async function () {
    // Transfer tokens to user1
    await mockToken.connect(owner).transfer(user1.address, DEPOSIT_AMOUNT);

    // User1 approves ReputationManager to spend tokens
    await mockToken.connect(user1).approve(await reputationSystem.getAddress(), DEPOSIT_AMOUNT);

    // Check initial balances
    const user1BalanceBefore = await mockToken.balanceOf(user1.address);
    const escrowBalanceBefore = await mockToken.balanceOf(await erc20Escrow.getAddress());

    // Initiate ERC20 Escrow
    await reputationSystem.connect(user1).initiateERC20Escrow(DEPOSIT_AMOUNT);

    // Check balances after deposit
    expect(await mockToken.balanceOf(user1.address)).to.equal(user1BalanceBefore - DEPOSIT_AMOUNT);
    expect(await mockToken.balanceOf(await erc20Escrow.getAddress())).to.equal(escrowBalanceBefore + DEPOSIT_AMOUNT);
    expect(await erc20Escrow.getBalance()).to.equal(DEPOSIT_AMOUNT);

    // Release to beneficiary
    await reputationSystem.connect(owner).releaseERC20Escrow();
    expect(await mockToken.balanceOf(beneficiary.address)).to.equal(DEPOSIT_AMOUNT);
    expect(await erc20Escrow.getBalance()).to.equal(0);

    // Deposit again for refund test
    await mockToken.connect(owner).transfer(user1.address, DEPOSIT_AMOUNT);
    await mockToken.connect(user1).approve(await reputationSystem.getAddress(), DEPOSIT_AMOUNT);
    await reputationSystem.connect(user1).initiateERC20Escrow(DEPOSIT_AMOUNT);

    // Refund to depositor
    const depositorBalanceBefore = await mockToken.balanceOf(user1.address);
    await reputationSystem.connect(owner).refundERC20Escrow();
    expect(await mockToken.balanceOf(user1.address)).to.equal(DEPOSIT_AMOUNT);
    expect(await erc20Escrow.getBalance()).to.equal(0);
  });
});