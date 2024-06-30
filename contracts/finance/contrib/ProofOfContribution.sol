// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../../id/IdentityManager.sol";
import "../../token/SWTCH.sol";

/**
 * @title ProofOfContribution
 * @author astor@swtch.network
 * @notice SWTCH Proof of Contribution contract is a smart contract designed to incentivize and reward contributors for their valuable contributions to a project. Put simply it is a Payroll smart contract. 
 *         This is achieved by leveraging the SWTCH ERC-20 token. The contract ensures secure and verifiable contributions through cryptographic signatures and provides a flexible system for defining different types of contributions and their associated rewards.
 */
contract ProofOfContribution is OwnableUpgradeable {
    
    IdentityManager private identityManager;

    SWTCH public token;
    address public tokenAddress;
    uint256 public nextContributionTypeId = 1;
    
    struct ContributionType {
        string name;
        uint256 rewardRate;
    }
    
    struct Contribution {
        address contributor;
        string contentHash;
        uint256 contributionTypeId;
        bool approved;
        uint256 reward;
    }
    
    Contribution[] public contributionQueue;
    mapping(uint256 => ContributionType) public contributionTypes;
    mapping(address => bool) public allowedContributors;

    event ContributionAdded(uint256 indexed contributionId, address indexed contributor, string contentHash, uint256 contributionTypeId);
    event ContributionApproved(uint256 indexed contributionId, address indexed contributor, uint256 reward);
    event ContributionTypeAdded(uint256 contributionTypeId, string name, uint256 rewardRate);
    event RewardRateUpdated(uint256 contributionTypeId, uint256 newRewardRate);
    event ContributorAdded(address indexed contributor);
    event ContributorRemoved(address indexed contributor);

    modifier onlyAllowedContributors() {
        require(allowedContributors[msg.sender], "You are not allowed to contribute");
        _;
    }

    function initialize(address _tokenAddress, address _identityManagerAddress) public initializer {
        __Ownable_init(msg.sender);
        identityManager = IdentityManager(_identityManagerAddress);
        tokenAddress = _tokenAddress;
        token = SWTCH(tokenAddress);
    }

    function addContributor(address contributor) public onlyOwner {
        require(identityManager.isOwnerOrDelegate(contributor, contributor), "Sender is not a registered DID");
        allowedContributors[contributor] = true;
        emit ContributorAdded(contributor);
    }

    function removeContributor(address contributor) public onlyOwner {
        allowedContributors[contributor] = false;
        emit ContributorRemoved(contributor);
    }

    function getContributionType(
        uint256 contributionId
        ) public view returns(ContributionType memory) {
        return contributionTypes[contributionId];
    }

    function addContributionType(string memory name, uint256 rewardRate) public onlyOwner {
        contributionTypes[nextContributionTypeId] = ContributionType(name, rewardRate);
        emit ContributionTypeAdded(nextContributionTypeId, name, rewardRate);
        nextContributionTypeId++;
    }

    function addContribution(
        string memory contentHash,
        uint256 contributionTypeId,
        address contributor,
        bytes memory signature
    ) public onlyAllowedContributors {
        require(contributionTypes[contributionTypeId].rewardRate > 0, "Invalid contribution type");
        require(verifySignature(contentHash, contributor, contributionTypeId, signature), "Invalid signature");

        uint256 reward = contributionTypes[contributionTypeId].rewardRate;

        contributionQueue.push(Contribution({
            contributor: contributor,
            contentHash: contentHash,
            contributionTypeId: contributionTypeId,
            approved: false,
            reward: reward
        }));

        emit ContributionAdded(contributionQueue.length - 1, contributor, contentHash, contributionTypeId);
    }

    function approveContribution(uint256 contributionId) public onlyOwner {
        require(contributionId <= contributionQueue.length-1, "No such contributionId");
        Contribution storage contribution = contributionQueue[contributionId];
        require(!contribution.approved, "Contribution already approved");

        contribution.approved = true;
        require(token.transfer(contribution.contributor, contribution.reward), "SWTCH Token transfer failed.");

        emit ContributionApproved(contributionId, contribution.contributor, contribution.reward);
    }

    function setRewardRate(uint256 contributionTypeId, uint256 newRewardRate) public onlyOwner {
        require(contributionTypes[contributionTypeId].rewardRate > 0, "Invalid contribution type");
        contributionTypes[contributionTypeId].rewardRate = newRewardRate;
        emit RewardRateUpdated(contributionTypeId, newRewardRate);
    }

    function verifySignature(
        string memory contentHash,
        address contributor,
        uint256 contributionTypeId,
        bytes memory signature
    ) internal pure returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(contentHash, contributor, contributionTypeId));
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == contributor;
    }

    function getEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature) internal pure returns (address) {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }
}
