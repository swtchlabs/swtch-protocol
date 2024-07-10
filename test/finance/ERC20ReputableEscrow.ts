import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { MockERC20, ERC20ReputableEscrow, ERC20ReputableEscrow__factory, ReputationManager } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20ReputableEscrow", function () {
  let reputationSystem: ReputationManager;

  let mockToken: MockERC20;
  let erc20Escrow: ERC20ReputableEscrow;
  let owner: SignerWithAddress;
  let depositor: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let arbiter: SignerWithAddress;

  const TOTAL_SUPPLY = ethers.toBigInt(1000000);
  const TRANSFER_AMOUNT = ethers.toBigInt(100);
  const DEPOSIT_AMOUNT = ethers.toBigInt(10);

  beforeEach(async function () {
    [owner, depositor, beneficiary, arbiter] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy(TOTAL_SUPPLY);
    await mockToken.getDeployedCode();

    // Deploy ERC20Escrow
    const ERC20Escrow = await ethers.getContractFactory("ERC20ReputableEscrow") as ERC20ReputableEscrow__factory;
    erc20Escrow = await ERC20Escrow.connect(depositor).deploy();
    await erc20Escrow.getDeployedCode();
    await erc20Escrow.initialize
    (
      await mockToken.getAddress(),
      depositor.address,
      beneficiary.address,
      arbiter.address
    );

    // Transfer tokens to erc20Escrow
    await mockToken.connect(owner).transfer(await erc20Escrow.getAddress(), DEPOSIT_AMOUNT);
    await mockToken.connect(owner).transfer(depositor.address, DEPOSIT_AMOUNT);

    // Deploy ReputationManager
    const ReputationManager = await ethers.getContractFactory("ReputationManager", owner);
    reputationSystem = await upgrades.deployProxy(ReputationManager, [
      ethers.ZeroAddress, // not testing IdentityManager here
      ethers.ZeroAddress, // not testing regular Escrow here
      await erc20Escrow.getAddress(), // testing ERC20Escrow here
      ethers.ZeroAddress
    ]) as any;
    await reputationSystem.getDeployedCode();

    // Set ReputationManager in ERC20ReputableEscrow
    await erc20Escrow.setReputationManager(await reputationSystem.getAddress());

    // Transfer some tokens to user1 for testing
    await mockToken.connect(owner).transfer(await depositor.getAddress(), DEPOSIT_AMOUNT);
    await mockToken.connect(owner).transfer(await reputationSystem.getAddress(), DEPOSIT_AMOUNT);
  });

  it("should integrate with ERC20 escrow contracts", async function () {
    const escrowAddress = await erc20Escrow.getAddress();

    // Approve ERC20Escrow to transfer tokens
    await mockToken.connect(depositor).approve(await reputationSystem.getAddress(), TRANSFER_AMOUNT);
    
    // Deposit Tokens
    await reputationSystem.connect(depositor).initiateERC20Escrow(DEPOSIT_AMOUNT);
    expect(await mockToken.balanceOf(await reputationSystem.getAddress())).to.equal(DEPOSIT_AMOUNT);

    // Release to beneficiary
    await reputationSystem.connect(owner).releaseERC20Escrow();
    expect(await mockToken.balanceOf(depositor.address)).to.equal(DEPOSIT_AMOUNT);

    // Set up for refund test
    // Transfer tokens to erc20Escrow
    await mockToken.connect(owner).transfer(await reputationSystem.getAddress(), DEPOSIT_AMOUNT);
    await mockToken.connect(depositor).approve(await reputationSystem.getAddress(), DEPOSIT_AMOUNT);
    await reputationSystem.connect(depositor).initiateERC20Escrow(DEPOSIT_AMOUNT);

    // Refund to depositor
    await reputationSystem.connect(owner).refundERC20Escrow();
    expect(await mockToken.balanceOf(depositor.address)).to.equal(DEPOSIT_AMOUNT);
  });
});