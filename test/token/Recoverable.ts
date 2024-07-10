import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  Recoverable,
  Recoverable__factory,
  MockERC20,
  MockERC20__factory
} from "../../typechain-types";

describe("Recoverable", function () {
  let recoverable: Recoverable;
  let mockToken1: MockERC20;
  let mockToken2: MockERC20;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let recipient: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const TOTAL_SUPPLY = ethers.toBigInt(100000000);
  const initialBalance = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user, recipient, unauthorized] = await ethers.getSigners();

    // Deploy Recoverable
    const RecoverableFactory = await ethers.getContractFactory("Recoverable");
    recoverable = await upgrades.deployProxy(RecoverableFactory) as any;
    await recoverable.getDeployedCode();
    await recoverable.waitForDeployment();

    // Deploy mock ERC20 tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken1 = await MockERC20Factory.deploy(TOTAL_SUPPLY);
    mockToken2 = await MockERC20Factory.deploy(TOTAL_SUPPLY);
    
    await mockToken1.getDeployedCode();
    await mockToken2.getDeployedCode();

    // Mint tokens to the recoverable contract
    await mockToken1.mint(await recoverable.getAddress(), initialBalance);
    await mockToken2.mint(await recoverable.getAddress(), initialBalance);

    // Send ETH to the recoverable contract
    await owner.sendTransaction({
      to: await recoverable.getAddress(),
      value: initialBalance
    });
  });

  describe("Initialization", function () {
    it("should set the correct owner", async function () {
      expect(await recoverable.owner()).to.equal(owner.address);
    });
  });

  describe("Token Recovery", function () {
    it("should allow owner to recover multiple tokens", async function () {
      const tokens = [await mockToken1.getAddress(), await mockToken2.getAddress()];
      
      await expect(recoverable.connect(owner).recoverTokens(tokens, recipient.address))
        .to.emit(recoverable, "TokensRecovered").withArgs(tokens[0], recipient.address, initialBalance)
        .and.to.emit(recoverable, "TokensRecovered").withArgs(tokens[1], recipient.address, initialBalance);

      expect(await mockToken1.balanceOf(recipient.address)).to.equal(initialBalance);
      expect(await mockToken2.balanceOf(recipient.address)).to.equal(initialBalance);
    });

    it("should not recover tokens with zero balance", async function () {
      const emptyToken = await (await ethers.getContractFactory("MockERC20")).deploy(TOTAL_SUPPLY);
      const tokens = [await emptyToken.getAddress()];
      
      await expect(recoverable.connect(owner).recoverTokens(tokens, recipient.address))
        .to.not.emit(recoverable, "TokensRecovered");
    });

    it("should not allow non-owners to recover tokens", async function () {
      const tokens = [await mockToken1.getAddress()];
      await expect(recoverable.connect(unauthorized).recoverTokens(tokens, recipient.address))
      .to.be.revertedWithCustomError;
    });
  });

  describe("ETH Recovery", function () {
    it("should allow owner to recover ETH", async function () {
      const initialRecipientBalance = await ethers.provider.getBalance(recipient.address);
      
      await expect(recoverable.connect(owner).recoverETH(recipient.address))
        .to.emit(recoverable, "ETHRecovered")
        .withArgs(recipient.address, initialBalance);

      const finalRecipientBalance = await ethers.provider.getBalance(recipient.address);
      expect(finalRecipientBalance - initialRecipientBalance).to.equal(initialBalance);
    });

    it("should not allow recovery of zero ETH balance", async function () {
      await recoverable.connect(owner).recoverETH(recipient.address);
      await expect(recoverable.connect(owner).recoverETH(recipient.address))
        .to.be.revertedWith("No ETH to recover");
    });

    it("should not allow non-owners to recover ETH", async function () {
      await expect(recoverable.connect(unauthorized).recoverETH(recipient.address))
        .to.be.revertedWithCustomError;
    });
  });

  describe("Receive Function", function () {
    it("should allow the contract to receive ETH", async function () {
      const sendAmount = ethers.parseEther("1");
      await expect(owner.sendTransaction({
        to: await recoverable.getAddress(),
        value: sendAmount
      })).to.changeEtherBalance(recoverable, sendAmount);
    });
  });
});