// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { CombinedIdentity, CombinedIdentityProvider } from "../typechain-types";

// describe("CombinedIdentity and CombinedIdentityProvider", function () {
//   let owner: any;
//   let user: any;
//   let combinedIdentity: CombinedIdentity;
//   let combinedIdentityProvider: CombinedIdentityProvider;

//   before(async function () {
//     [owner, user] = await ethers.getSigners();

//     const ownerAddress = await owner.getAddress();
//     const CombinedIdentity = await ethers.getContractFactory("CombinedIdentity");
//     combinedIdentity = await CombinedIdentity.deploy(ownerAddress) as CombinedIdentity;
//     await combinedIdentity.getDeployedCode();

//     const combinedIdentityAddress = await combinedIdentity.getAddress();
//     console.log("combinedIdentityAddress:", combinedIdentityAddress);
//     const CombinedIdentityProvider = await ethers.getContractFactory("CombinedIdentityProvider");
//     combinedIdentityProvider = await CombinedIdentityProvider.deploy(combinedIdentityAddress) as CombinedIdentityProvider;
//     await combinedIdentityProvider.getDeployedCode();
//   });

//   it("should add and retrieve identity data", async function () {
//     const userAddress = await user.getAddress();
//     const key = ethers.keccak256(ethers.toUtf8Bytes("identity-" + userAddress));
//     const value = ethers.toUtf8Bytes("example-identity-data");

//     await combinedIdentity.connect(owner).setData(key, value);
//     const retrievedValue = await combinedIdentity.getData(key);

//     console.log("Expected Value:", ethers.hexlify(value));
//     console.log("Retrieved Value:", ethers.hexlify(retrievedValue));

//     expect(ethers.hexlify(retrievedValue)).to.equal(ethers.hexlify(value));
//   });

//   it("should validate identity", async function () {
//     const userAddress = await user.getAddress();
//     const isValid = await combinedIdentityProvider.isValidIdentity(userAddress);
//     expect(isValid).to.be.true;
//   });

//   it("should retrieve identity details", async function () {
//     const userAddress = await user.getAddress();
//     const key = ethers.keccak256(ethers.toUtf8Bytes(`identity-${userAddress}`));
//     const value = ethers.toUtf8Bytes("example-identity-data");

//     await combinedIdentity.connect(owner).setData(key, value);
//     // await combinedIdentityProvider.setUserData(key, value);
    
//     const identityDetails = await combinedIdentity.getData(key);     
//     let otherDetails = await combinedIdentityProvider.getIdentityDetails(userAddress);
    
//     // console.log("Expected Value:", ethers.hexlify(value));
//     console.log("Identity Details:", ethers.hexlify(otherDetails));

//     expect(ethers.hexlify(identityDetails)).to.equal(ethers.hexlify(value));
//   });
// });
