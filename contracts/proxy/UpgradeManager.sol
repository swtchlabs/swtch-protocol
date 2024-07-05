// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IUpgradeable {
    function upgradeTo(address newImplementation) external;
}

contract UpgradeManager is OwnableUpgradeable {
    address public admin;
    address public proxyAddress;
    /**
     * @dev Array of addresses that can approve upgrades
     * @notice TODO provide IGovernance integration.
     */
    address[] public signers; 

    struct UpgradeProposal {
        address newImplementation;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    mapping(uint256 => UpgradeProposal) public proposals;
    uint256 public nextProposalId;

    event UpgradeInitiated(uint256 indexed proposalId, address indexed newImplementation);
    event UpgradeApproved(uint256 indexed proposalId, address approver);

    constructor(address _proxyAddress, address[] memory _signers) {
        proxyAddress = _proxyAddress;
        signers = _signers;
        admin = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        // transferOwnership(admin);
        __Ownable_init(msg.sender);
    }

    function initialize(address _proxyAddress, address[] memory _signers) public initializer {
        transferOwnership(admin);
        proxyAddress = _proxyAddress;
        signers = _signers;
    }

    function getOwner() external view returns(address) {
        return admin;
    }

    function proposeUpgrade(address newImplementation) public onlyOwner returns (uint256) {
        UpgradeProposal storage proposal = proposals[nextProposalId];
        proposal.newImplementation = newImplementation;
        proposal.approvalCount = 0;

        emit UpgradeInitiated(nextProposalId, newImplementation);
        return nextProposalId++;
    }

    function approveUpgrade(uint256 proposalId) public {
        require(isSigner(msg.sender), "Caller is not a signer");
        UpgradeProposal storage proposal = proposals[proposalId];
        require(proposal.newImplementation != address(0), "Invalid proposal");
        require(!proposal.approvals[msg.sender], "Already approved");

        proposal.approvals[msg.sender] = true;
        proposal.approvalCount++;

        emit UpgradeApproved(proposalId, msg.sender);

        if (proposal.approvalCount == signers.length) {
            IUpgradeable(proxyAddress).upgradeTo(proposal.newImplementation);
        }
    }

    function isSigner(address _address) private view returns (bool) {
        for (uint i = 0; i < signers.length; i++) {
            if (signers[i] == _address) {
                return true;
            }
        }
        return false;
    }

    function addSigner(address _newSigner) public onlyOwner {
        signers.push(_newSigner);
    }

    function removeSigner(address _signer) public onlyOwner {
        for (uint i = 0; i < signers.length; i++) {
            if (signers[i] == _signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
    }
}
