import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect, use } from "chai";
  import hre from "hardhat";
import { ethers } from "hardhat";

// TODO Fix broken tests around upgrades and admin changes.
describe("UUPSProxy", function () {
  let proxy: any;
  let implementation: any;
  let proxyAsImplementation: any; 
  let newImplementation: any;
  let admin: any;
  let user1: any;
  let accounts: any[];

  beforeEach(async function () {
    [admin, user1, ...accounts] = await ethers.getSigners();

    const ImplFactory = await ethers.getContractFactory("MockBusinessLogic");
    implementation = await ImplFactory.deploy();
    await implementation.deployed(); // Ensuring the implementation is fully deployed

    const ProxyFactory = await ethers.getContractFactory("UUPSProxy");
    proxy = await ProxyFactory.deploy(implementation.address);
    await proxy.deployed(); // Ensuring the proxy is fully deployed

    // Checking if implementation address is set correctly
    expect(await proxy.callStatic._implementation()).to.equal(implementation.address);
    
    // Using the proxy address to create an instance of the implementation contract
    proxyAsImplementation = await ethers.getContractAt("MockBusinessLogic", proxy.address);

    // Deploy a new implementation for upgrade testing
    newImplementation = await ImplFactory.deploy();
    await newImplementation.deployed(); // Ensuring the new implementation is fully deployed
  });

//   it("should upgrade to a new implementation", async function () {
//     await expect(proxy.connect(admin).upgradeTo(newImplementation.address))
//       .to.emit(proxy, 'Upgraded')
//       .withArgs(newImplementation.address);

//     expect(await proxy.callStatic._implementation()).to.equal(newImplementation.address);
//   });

//   it("should change admin successfully", async function () {
//     await expect(proxy.connect(admin).changeAdmin(user1.address))
//       .to.emit(proxy, 'AdminChanged')
//       .withArgs(admin.address, user1.address);

//     expect(await proxy.callStatic.admin()).to.equal(user1.address);
//   });
});
