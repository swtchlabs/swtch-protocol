import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import hre from "hardhat";
import { RoleBasedAccessControl } from "../typechain-types";

describe("Role Based Access Control", async function() {
    let rbac: RoleBasedAccessControl;
    let admin: any;
    let user1: any;
    let user2: any;
    let addrs;

    const MINTER_ROLE = hre.ethers.hashMessage("MINTER_ROLE");

    beforeEach(async function () {
        // Get the signers
      [admin, user1, user2, ...addrs] = await hre.ethers.getSigners();

      // Deploy the contract
      const RBACFactory = await hre.ethers.getContractFactory("RoleBasedAccessControl", admin);
      rbac = await RBACFactory.deploy(admin);
      await rbac.getDeployedCode();
    });

    it("should allow granting a role", async () => {
        await rbac.grantRole(MINTER_ROLE, user1, { from: admin });
        assert.isTrue(await rbac.hasRole(MINTER_ROLE, user1), "Role was not granted correctly");
    });

    it("should allow revoking a role", async () => {
        await rbac.grantRole(MINTER_ROLE, user1, { from: admin });
        await rbac.revokeRole(MINTER_ROLE, user1, { from: admin });
        assert.isFalse(await rbac.hasRole(MINTER_ROLE, user1), "Role was not revoked correctly");
    });

    it("should not allow unauthorized users to grant roles", async () => {
        try {
            await rbac.grantRole(MINTER_ROLE, user2, { from: user1 });
            assert.fail("Unauthorized user should not be able to grant roles");
        } catch (error:any) {
            assert(error.message.includes("code=INVALID_ARGUMENT"), "Expected revert error not received");
        }
    });

    it("should not allow unauthorized users to revoke roles", async () => {
        try {
            await rbac.revokeRole(MINTER_ROLE, user2, { from: user1 });
            assert.fail("Unauthorized user should not be able to revoke roles");
        } catch (error:any) {
            assert(error.message.includes("code=INVALID_ARGUMENT"), "Expected revert error not received");
        }
    });
});