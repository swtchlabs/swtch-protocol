import { expect } from "chai";
import { ethers } from "hardhat";
import { solidityPackedKeccak256, toBigInt } from "ethers";
import { ProofOfContribution, SWTCH } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ProofOfContribution", function () {
    let token: SWTCH;
    let contrib: ProofOfContribution;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let addrs: SignerWithAddress[];

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("SWTCH");
        token = await TokenFactory.deploy();
        await token.getDeployedCode();
        await token.initialize(toBigInt(100000000), owner.address);

        const ProofOfContributionFactory = await ethers.getContractFactory("ProofOfContribution");
        contrib = await ProofOfContributionFactory.deploy();
        await contrib.getDeployedCode();
        await contrib.initialize(await token.getAddress());

        // Transfer SWTCH tokens to the ProofOfContribution smart contract
        // ProofOfContribution cannot mint tokens, it can only distribute
        token.connect(owner).transfer(await contrib.getAddress(), toBigInt(100));
    });

    it("should add and remove contributors", async function () {
        await contrib.addContributor(addr1.address);
        expect(await contrib.allowedContributors(addr1.address)).to.be.true;

        await contrib.removeContributor(addr1.address);
        expect(await contrib.allowedContributors(addr1.address)).to.be.false;
    });

    it("should add contribution types", async function () {
        await contrib.addContributionType("Commit", 10);
        const contributionType = await contrib.contributionTypes(1);
        expect(contributionType.name).to.equal("Commit");
        expect(contributionType.rewardRate).to.equal(10);
    });

    it("should set reward rates", async function () {
        await contrib.addContributionType("Commit", 10);
        await contrib.setRewardRate(1, 20);
        const contributionType = await contrib.contributionTypes(1);
        expect(contributionType.rewardRate).to.equal(20);
    });

    it("should add contributions", async function () {
        await contrib.addContributor(addr1.address);
        await contrib.addContributionType("Commit", 10);

        const messageHash = solidityPackedKeccak256(
            ["string", "address", "uint256"],
            ["298b091df1edf37ec8e195e4c07ba97735d303a9", addr1.address, 1]
        );
        const signature = await addr1.signMessage(ethers.toBeArray(messageHash));

        await contrib.connect(addr1).addContribution(
            "298b091df1edf37ec8e195e4c07ba97735d303a9",
            1,
            addr1.address,
            signature
        );

        const contribution = await contrib.contributionQueue(0);
        expect(contribution.contentHash).to.equal("298b091df1edf37ec8e195e4c07ba97735d303a9");
        expect(contribution.contributor).to.equal(addr1.address);
        expect(contribution.contributionTypeId).to.equal(1);
        expect(contribution.approved).to.be.false;
        expect(contribution.reward).to.equal(10);
    });

    it("should approve contributions", async function () {
        await contrib.addContributor(addr1.address);
        await contrib.addContributionType("Commit", 10);

        const messageHash = solidityPackedKeccak256(
            ["string", "address", "uint256"],
            ["7267664dc16e4f4b0e78b220d301351067252e3e", addr1.address, 1]
        );
        const signature = await addr1.signMessage(ethers.toBeArray(messageHash));

        await contrib.connect(addr1).addContribution(
            "7267664dc16e4f4b0e78b220d301351067252e3e",
            1,
            addr1.address,
            signature
        );

        await contrib.approveContribution(0);
        const contribution = await contrib.contributionQueue(0);
        expect(contribution.approved).to.be.true;
        expect(await token.balanceOf(addr1.address)).to.equal(10);
    });

    it("should not allow non-allowed contributors to add contributions", async function () {
        await contrib.addContributionType("Commit", 10);

        const messageHash = solidityPackedKeccak256(
            ["string", "address", "uint256"],
            ["511fe5bfbb935eb3813bd729f126c4155a34646b", addr1.address, 1]
        );
        const signature = await addr1.signMessage(ethers.toBeArray(messageHash));

        await expect(
            contrib.connect(addr1).addContribution(
                "511fe5bfbb935eb3813bd729f126c4155a34646b",
                1,
                addr1.address,
                signature
            )
        ).to.be.revertedWith("You are not allowed to contribute");
    });
});
