// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../../did/IdentityManager.sol";

/**
 * @title ERC20ProofOfFunds
 * @author astor@swtch.network
 * @notice ERC20ProofOfFunds is responsible for managing proof of funds using ERC20 tokens.
 * This contract allows users to deposit ERC20 tokens, create proofs of funds, and verify these proofs.
 * It integrates with an IdentityManager for access control and is designed to be upgradeable.
 *
 * @dev This contract inherits from Initializable, OwnableUpgradeable, and ReentrancyGuardUpgradeable.
 * It uses OpenZeppelin's upgradeable contracts for enhanced security and flexibility.
 *
 * Key features:
 * - Deposit ERC20 tokens
 * - Create time-bound proofs of funds
 * - Verify and use proofs
 * - Withdraw tokens (owner only)
 * - Integration with IdentityManager for DID-based access control
 */
contract ERC20ProofOfFunds is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
  
    struct Proof {
        uint256 amount;
        uint256 expirationTime;
        bool isUsed;
    }

    IERC20 public token;
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

    function initialize(address _token, address _identityManager) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        token = IERC20(_token);
        identityManager = IdentityManager(_identityManager);
    }

    function deposit(uint256 amount) external onlyDIDOwner(msg.sender) nonReentrant {
        require(amount > 0, "Deposit amount must be greater than 0");
        token.transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function createProof(uint256 amount, uint256 duration) external onlyDIDOwner(msg.sender) returns (bytes32) {
        require(amount <= token.balanceOf(address(this)), "Insufficient funds in contract");
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
        require(amount <= token.balanceOf(address(this)), "Insufficient funds in contract");
        token.transfer(owner(), amount);
        emit Withdrawn(owner(), amount);
    }

    function getBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}