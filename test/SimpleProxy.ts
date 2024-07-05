import { expect } from "chai";
import hre from "hardhat";
import { LogicContract, SimpleProxy } from "../typechain-types";

describe("SimpleProxy", function () {
  let LogicContractFactory: hre.ethers.Contract;
  let logicContract: LogicContract;
  let ProxyContractFactory: hre.ethers.Contract;
  let proxy: SimpleProxy;
  let admin: hre.ethers.Signer;
  let user: hre.ethers.Signer;
  let newAdmin: hre.ethers.Signer;
  let otherAccount: hre.ethers.Signer;

  beforeEach(async function () {
    // Deploy LogicContract
    LogicContractFactory = await hre.ethers.getContractFactory("LogicContract");
    logicContract = await LogicContractFactory.deploy();
    await logicContract.getDeployedCode();

    // Get signers
    [admin, user, newAdmin, otherAccount] = await hre.ethers.getSigners();

    // Deploy ProxyContract
    ProxyContractFactory = await hre.ethers.getContractFactory("SimpleProxy");
    proxy = await ProxyContractFactory.connect(admin).deploy(await logicContract.getAddress());
    await proxy.getDeployedCode();

    // Set the proxy implementation to the logic contract
    await proxy.connect(admin).upgrade(await logicContract.getAddress());
  });

  describe("Deployment", function () {
    it("should set the right admin", async function () {
      expect(await proxy.admin()).to.equal(await admin.getAddress());
    });

    it("should set the right initial implementation", async function () {
      expect(await proxy.implementation()).to.equal(await logicContract.getAddress());
    });
  });

  describe("Admin functions", function () {
    it("should allow admin to change admin", async function () {
      await proxy.connect(admin).changeAdmin(await newAdmin.getAddress());
      expect(await proxy.admin()).to.equal(await newAdmin.getAddress());
    });

    it("should prevent non-admin from changing admin", async function () {
      await expect(proxy.connect(user).changeAdmin(await newAdmin.getAddress()))
        .to.be.revertedWith("Unauthorized: caller is not the admin");
    });

    it("should allow admin to upgrade implementation", async function () {
      const newLogicContract = await LogicContractFactory.deploy();
      await newLogicContract.getDeployedCode();
      await proxy.connect(admin).upgrade(await newLogicContract.getAddress());
      expect(await proxy.implementation()).to.equal(await newLogicContract.getAddress());
    });

    it("should prevent non-admin from upgrading implementation", async function () {
      const newLogicContract = await LogicContractFactory.deploy();
      await newLogicContract.getDeployedCode();
      await expect(proxy.connect(user).upgrade(await newLogicContract.getAddress()))
        .to.be.revertedWith("Unauthorized: caller is not the admin");
    });
  });

  // Additional tests could include interaction via the proxy, admin role transfers, and more complex upgrade scenarios
});
