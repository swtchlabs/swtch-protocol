import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityManager, IdentityManager__factory, MockERC20, ERC20Escrow, ERC20Escrow__factory } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC20Escrow", function () {
  let identityManager: IdentityManager;

  let mockToken: MockERC20;
  let erc20Escrow: ERC20Escrow;
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

    // Deploy IdentityManager
    const IdentityManagerFactory = await ethers.getContractFactory("IdentityManager") as IdentityManager__factory;
    identityManager = await IdentityManagerFactory.deploy();
    await identityManager.initialize();

    // Registering DIDs
    await identityManager.registerIdentity(owner.address, owner.address, "did:user1DID");
    await identityManager.registerIdentity(depositor.address, depositor.address, "did:user2DID");
    await identityManager.registerIdentity(beneficiary.address, beneficiary.address, "did:beneficiaryDID");
    await identityManager.registerIdentity(arbiter.address, arbiter.address, "did:arbiterDID");

    // Deploy ERC20Escrow
    const ERC20Escrow = await ethers.getContractFactory("ERC20Escrow") as ERC20Escrow__factory;
    erc20Escrow = await ERC20Escrow.connect(depositor).deploy();
    await erc20Escrow.getDeployedCode();
    await erc20Escrow.initialize
    (
      await mockToken.getAddress(),
      depositor.address,
      beneficiary.address,
      arbiter.address,
      await identityManager.getAddress()
    );

    // Transfer tokens to erc20Escrow
    await mockToken.connect(owner).transfer(await erc20Escrow.getAddress(), DEPOSIT_AMOUNT);

  });

  it("should integrate with ERC20 escrow contracts", async function () {
    const escrowAddress = await erc20Escrow.getAddress();

    // Approve ERC20Escrow to transfer user1's tokens
    await mockToken.connect(depositor).approve(escrowAddress, TRANSFER_AMOUNT);

    // Deposit Tokens
    await erc20Escrow.connect(depositor).deposit(DEPOSIT_AMOUNT);
    expect(await mockToken.balanceOf(escrowAddress)).to.equal(DEPOSIT_AMOUNT);

    // Release to beneficiary
    await erc20Escrow.connect(arbiter).releaseToBeneficiary();
    expect(await mockToken.balanceOf(beneficiary.address)).to.equal(DEPOSIT_AMOUNT);

    // Set up for refund test
    // Transfer tokens to erc20Escrow
    await mockToken.connect(owner).transfer(await erc20Escrow.getAddress(), DEPOSIT_AMOUNT);
    await mockToken.connect(depositor).approve(escrowAddress, DEPOSIT_AMOUNT);
    await erc20Escrow.connect(depositor).deposit(DEPOSIT_AMOUNT);

    // Refund to depositor
    await erc20Escrow.connect(arbiter).refundToDepositor();
    expect(await mockToken.balanceOf(depositor.address)).to.equal(DEPOSIT_AMOUNT);
  });
});