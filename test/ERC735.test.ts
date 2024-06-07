import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC735 } from "../typechain-types";

describe("ERC-735 Claims", function () {
  let owner: any;
  let user: any;
  let erc735: ERC735;

  before(async function () {
    [owner, user] = await ethers.getSigners();

    const ERC735Identity = await ethers.getContractFactory("ERC735");
    erc735 = await ERC735Identity.deploy(await owner.getAddress()) as ERC735;
    await erc735.getDeployedCode();
  });

  it("should add and retrieve a claim", async function () {
    const topic = 1;
    const issuer = user.address;
    const signature = ethers.toUtf8Bytes("signature");
    const data = ethers.toUtf8Bytes("data");
    const uri = "https://swtch.network";

    const tx = await erc735.addClaim(topic, issuer, signature, data, uri);
    const receipt = await tx.wait();

    const event = receipt?.logs.find((log) => {
        const parsedLog = erc735.interface.parseLog(log);
        return parsedLog?.name === "ClaimAdded";
    });
  
    const parsedEvent = erc735.interface.parseLog(event!);
    const claimId = parsedEvent?.args.claimId;

    const claim = await erc735.getClaim(claimId);

    expect(claim.claimType).to.equal(topic);
    expect(claim.issuer).to.equal(issuer);
    expect(ethers.hexlify(claim.signature)).to.equal(ethers.hexlify(signature));
    expect(ethers.hexlify(claim.data)).to.equal(ethers.hexlify(data));
    expect(claim.uri).to.equal(uri);
    
  });

  it("should retrieve claims by topic", async function () {
    const topic = 2;
    const issuer = await user.getAddress();
    const signature = ethers.toUtf8Bytes("signature");
    const data = ethers.toUtf8Bytes("data");
    const uri = "https://swtch.network";

    const tx = await erc735.addClaim(topic, issuer, signature, data, uri);
    await tx.wait();
    const claimIds = await erc735.getClaimIdsByType(topic);

    expect(claimIds.length).to.be.greaterThan(0);
  });

  it("should remove a claim", async function () {
    const topic = 3;
    const issuer = user.address;
    const signature = ethers.toUtf8Bytes("signature");
    const data = ethers.toUtf8Bytes("data");
    const uri = "https://swtch.network";

    const tx = await erc735.addClaim(topic, issuer, signature, data, uri);
    const receipt = await tx.wait();

    const event = receipt?.logs.find((log) => {
      const parsedLog = erc735.interface.parseLog(log);
      return parsedLog?.name === "ClaimAdded";
    });

    const parsedEvent = erc735.interface.parseLog(event!);
    const claimId = parsedEvent?.args.claimId;

    await erc735.removeClaim(claimId);
    const claim = await erc735.getClaim(claimId);

    expect(claim.claimType).to.equal(0);
    expect(claim.issuer).to.equal(ethers.ZeroAddress);
    expect(claim.signature).to.equal('0x');
    expect(claim.data).to.equal('0x');
    expect(claim.uri).to.equal('');
  });
});
