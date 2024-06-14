import { expect } from "chai";
import { ethers } from "hardhat";

import { SWTCH } from "../typechain-types";

describe("SWTCH Token", function () {
    let SWTCH: SWTCH;
    let owner: any;
    let addr1: any;
    let addr2: any;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const SWTCHFactory = await ethers.getContractFactory("SWTCH");
        SWTCH = await SWTCHFactory.deploy();
        await SWTCH.getDeployedCode();

        await SWTCH.initialize(ethers.parseEther("1000000000"), await owner.getAddress());
    });

    it("Should initialize the contract with the correct values", async function () {
        expect(await SWTCH.name()).to.equal("SWTCH Network Token");
        expect(await SWTCH.symbol()).to.equal("SWTCH");
        expect(await SWTCH.totalSupply()).to.equal(ethers.parseEther("1000000000"));
        expect(await SWTCH.balanceOf(await owner.getAddress())).to.equal(ethers.parseEther("1000000000"));
    });

    it("Should allow the owner to mint new tokens", async function () {
        const allocation = ethers.parseEther("2000000000");
        await SWTCH.adminMint(allocation);
        expect(await SWTCH.totalSupply()).to.equal(ethers.parseEther("3000000000"));
        expect(await SWTCH.balanceOf(owner.getAddress())).to.equal(ethers.parseEther("3000000000"));
    });

    it("Should emit AdminMint event when new tokens are minted", async function () {
        const allocation = ethers.parseEther("1000000000");
        await expect(SWTCH.adminMint(allocation))
            .to.emit(SWTCH, "AdminMint")
            .withArgs(await owner.getAddress(), allocation);
    });

    it("Should not allow non-owner to mint new tokens", async function () {
        const allocation = ethers.parseEther("1000000000");
        await expect(
            SWTCH.connect(addr1).adminMint(allocation)
        ).to.be.reverted;
    });

    it("Should transfer ownership correctly", async function () {
        await SWTCH.transferOwnership(await addr1.getAddress());
        expect(await SWTCH.owner()).to.equal(await addr1.getAddress());
    });

    it("Should allow new owner to mint tokens", async function () {
        await SWTCH.transferOwnership(await addr1.getAddress());
        await SWTCH.connect(addr1).adminMint(500);
        expect(await SWTCH.totalSupply()).to.equal("1000000000000000000000000500");
        expect(await SWTCH.balanceOf(await addr1.getAddress())).to.equal(500);
    });
});
