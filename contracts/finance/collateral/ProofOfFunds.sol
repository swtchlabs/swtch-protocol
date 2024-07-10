// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../../did/IdentityManager.sol";

/**
 * @title ProofOfFunds
 * @author astor@swtch.network
 * @notice ProofOfFunds is responsible for managing proof of funds using native ether cryptocurrency.
 */
contract ProofOfFunds is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    struct Proof {
        uint256 amount;
        uint256 expirationTime;
        bool isUsed;
    }

    mapping(bytes32 => Proof) public proofs;
    IdentityManager public identityManager;

    event ProofCreated(bytes32 indexed proofId, uint256 amount, uint256 expirationTime);
    event ProofUsed(bytes32 indexed proofId, address user);
    event Deposited(address indexed depositor, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }

    function initialize(address _identityManager) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        identityManager = IdentityManager(_identityManager);
    }

    function deposit() external payable onlyDIDOwner(msg.sender) nonReentrant {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        emit Deposited(msg.sender, msg.value);
    }

    function createProof(uint256 amount, uint256 duration) external onlyDIDOwner(msg.sender) returns (bytes32) {
        require(amount <= address(this).balance, "Insufficient funds in contract");
        uint256 expirationTime = block.timestamp + duration;
        bytes32 proofId = keccak256(abi.encodePacked(msg.sender, amount, expirationTime));
        
        proofs[proofId] = Proof(amount, expirationTime, false);
        
        emit ProofCreated(proofId, amount, expirationTime);
        return proofId;
    }

    function useProof(bytes32 proofId) external nonReentrant {
        Proof storage proof = proofs[proofId];
        require(proof.amount > 0, "Proof does not exist");
        require(!proof.isUsed, "Proof has already been used");
        require(block.timestamp <= proof.expirationTime, "Proof has expired");

        proof.isUsed = true;
        emit ProofUsed(proofId, msg.sender);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "Insufficient funds in contract");
        payable(owner()).transfer(amount);
        emit Withdrawn(owner(), amount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}