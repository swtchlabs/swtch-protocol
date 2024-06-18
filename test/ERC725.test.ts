import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC725Identity } from "../typechain-types";

describe("ERC-725 Identity", function () {
  let owner: any;
  let newOwner: any;
  let user: any;
  let erc725: ERC725Identity;

  before(async function () {
    [owner, newOwner, user] = await ethers.getSigners();

    const ERC725Identity = await ethers.getContractFactory("ERC725Identity");
    erc725 = await ERC725Identity.deploy(await owner.getAddress()) as ERC725Identity;
    await erc725.getDeployedCode();
  });

  it("should set and get data", async function () {
    const key = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
    const value = ethers.toUtf8Bytes("test-value");

    await erc725.connect(owner).setData(key, value);
    const retrievedValue = await erc725.getData(key);

    expect(ethers.hexlify(retrievedValue)).to.equal(ethers.hexlify(value));
  });

  it("should change owner", async function () {
    await erc725.connect(owner).changeOwner(newOwner.address);
    const currentOwner = await erc725.getOwner();

    expect(currentOwner).to.equal(newOwner.address);
  });

  it("should not allow non-owner to set data", async function () {
    const key = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
    const value = ethers.toUtf8Bytes("test-value");

    await expect(erc725.connect(user).setData(key, value)).to.be.revertedWith("Not the owner");
  });
});
