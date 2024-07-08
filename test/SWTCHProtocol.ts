import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SWTCH, SWTCHProtocol } from "../typechain-types";

describe("SWTCHProtocol", function () {
  let SWTCH: SWTCH;
  let swtchProtocol: SWTCHProtocol;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;

  const MEMBERSHIP_FEE = ethers.parseEther("100");
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock SWTCH token
    const SWTCHFactory = await ethers.getContractFactory("SWTCH");
    SWTCH = await SWTCHFactory.deploy();
    await SWTCH.getDeployedCode();
    await SWTCH.initialize(INITIAL_SUPPLY, await owner.getAddress());

    // Deploy SWTCHProtocol
    const SWTCHProtocol = await ethers.getContractFactory("SWTCHProtocol");
    swtchProtocol = await upgrades.deployProxy(SWTCHProtocol, [await SWTCH.getAddress(), MEMBERSHIP_FEE]) as any;

    // Transfer tokens to users for testing
    await SWTCH.transfer(await user1.getAddress(), ethers.parseEther("10000"));
    await SWTCH.transfer(await user2.getAddress(), ethers.parseEther("10000"));
  });

  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await swtchProtocol.owner()).to.equal(await owner.getAddress());
    });

    it("Should set the correct SWTCH token address", async function () {
      expect(await swtchProtocol.swtchToken()).to.equal(await SWTCH.getAddress());
    });

    it("Should set the correct membership fee", async function () {
      expect(await swtchProtocol.membershipFee()).to.equal(MEMBERSHIP_FEE);
    });
  });

  describe("Membership", function () {
    it("Should allow users to apply for membership", async function () {
      await SWTCH.connect(user1).approve(await swtchProtocol.getAddress(), MEMBERSHIP_FEE);
      await expect(swtchProtocol.connect(user1).applyForMembership())
        .to.emit(swtchProtocol, "MemberAdded")
        .withArgs(await user1.getAddress());
      
      expect(await swtchProtocol.members(await user1.getAddress())).to.be.true;
    });

    it("Should not allow membership without sufficient token approval", async function () {
      await expect(swtchProtocol.connect(user1).applyForMembership())
        .to.be.revertedWithCustomError;
    });

    it("Should allow owner to remove members", async function () {
      await SWTCH.connect(user1).approve(await swtchProtocol.getAddress(), MEMBERSHIP_FEE);
      await swtchProtocol.connect(user1).applyForMembership();

      await expect(swtchProtocol.connect(owner).removeMember(await user1.getAddress()))
        .to.emit(swtchProtocol, "MemberRemoved")
        .withArgs(await user1.getAddress());

      expect(await swtchProtocol.members(await user1.getAddress())).to.be.false;
    });

    it("Should deduct membership fee when applying for membership", async function () {
        const initialBalance = await SWTCH.balanceOf(await user1.getAddress());
        
        await SWTCH.connect(user1).approve(await swtchProtocol.getAddress(), MEMBERSHIP_FEE);
        await swtchProtocol.connect(user1).applyForMembership();
      
        const finalBalance = await SWTCH.balanceOf(await user1.getAddress());
        expect(finalBalance).to.equal(initialBalance-(MEMBERSHIP_FEE));
    });
  });

  describe("Proposals", function () {
    beforeEach(async function () {
      await SWTCH.connect(user1).approve(await swtchProtocol.getAddress(), MEMBERSHIP_FEE);
      await swtchProtocol.connect(user1).applyForMembership();
    });

    it("Should allow members to create proposals", async function () {
      await expect(swtchProtocol.connect(user1).createProposal("Test Proposal", 86400))
        .to.emit(swtchProtocol, "ProposalCreated")
        .withArgs(1, await user1.getAddress(), "Test Proposal");

      const proposal = await swtchProtocol.proposals(1);
      expect(proposal.description).to.equal("Test Proposal");
    });

    it("Should not allow non-members to create proposals", async function () {
      await expect(swtchProtocol.connect(user2).createProposal("Test Proposal", 86400))
        .to.be.revertedWith("Not a member");
    });

    it("Should allow members to vote on proposals", async function () {
      // Apply for membership
      await SWTCH.connect(user1).approve(await swtchProtocol.getAddress(), MEMBERSHIP_FEE);
      await swtchProtocol.connect(user1).applyForMembership();

      // Create a proposal
      await swtchProtocol.connect(user1).createProposal("Test Proposal", 86400);

      // Calculate expected voting power (initial balance minus membership fee)
      const combinedMembersFeeSpent = (MEMBERSHIP_FEE)+(MEMBERSHIP_FEE);
      const expectedVotingPower = ethers.parseEther("10000")-combinedMembersFeeSpent;

      // Vote on the proposal
      await swtchProtocol.connect(user1).vote(1, true);

      const proposal = await swtchProtocol.proposals(1);
      expect(proposal.forVotes).to.equal(expectedVotingPower);
    });

    it("Should allow owner to execute proposals", async function () {
      await swtchProtocol.connect(user1).createProposal("Test Proposal", 86400);
      await swtchProtocol.connect(user1).vote(1, true);

      await time.increase(86401);

      await expect(swtchProtocol.connect(owner).executeProposal(1))
        .to.emit(swtchProtocol, "ProposalApproved")
        .withArgs(1);

      const proposal = await swtchProtocol.proposals(1);
      expect(proposal.executed).to.be.true;
      expect(proposal.approved).to.be.true;
    });
  });

  describe("Contexts", function () {
    it("Should allow owner to register contexts", async function () {
      const contextAddress = await user3.getAddress();
      await expect(swtchProtocol.connect(owner).registerContext(contextAddress, "TestContext"))
        .to.emit(swtchProtocol, "ContextRegistered")
        .withArgs(contextAddress, "TestContext");

      const context = await swtchProtocol.getContext(contextAddress);
      expect(context.name).to.equal("TestContext");
      expect(context.active).to.be.true;
    });

    it("Should allow owner to set context activity", async function () {
      const contextAddress = await user3.getAddress();
      await swtchProtocol.connect(owner).registerContext(contextAddress, "IdentityManager");

      await expect(swtchProtocol.connect(owner).setContextActive(contextAddress, false))
        .to.emit(swtchProtocol, "ContextActiveChanged")
        .withArgs(contextAddress, false);

      const context = await swtchProtocol.getContext(contextAddress);
      expect(context.active).to.be.false;
    });

    it("Should return active contexts", async function () {
      const context1 = await user1.getAddress();
      const context2 = await user2.getAddress();
      const context3 = await user3.getAddress();

      await swtchProtocol.connect(owner).registerContext(context1, "IdentityManager");
      await swtchProtocol.connect(owner).registerContext(context2, "ReputationManager");
      await swtchProtocol.connect(owner).registerContext(context3, "SecretsManager");

      await swtchProtocol.connect(owner).setContextActive(context2, false);

      const activeContexts = await swtchProtocol.getActiveContexts();
      expect(activeContexts).to.have.lengthOf(2);
      expect(activeContexts).to.include(context1);
      expect(activeContexts).to.include(context3);
      expect(activeContexts).to.not.include(context2);
    });
  });
});