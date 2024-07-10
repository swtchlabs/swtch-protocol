// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../../did/IdentityManager.sol";

/**
 * @title ERC1155ProofOfFunds
 * @author astor@swtch.network
 * @notice ERC1155ProofOfFunds is responsible for managing proof of funds using ERC1155 tokens.
 * This contract allows users to deposit ERC1155 tokens, create proofs of ownership, and verify these proofs.
 * It integrates with an IdentityManager for access control and is designed to be upgradeable.
 *
 * @dev This contract inherits from Initializable, OwnableUpgradeable, and ReentrancyGuardUpgradeable.
 * It uses OpenZeppelin's upgradeable contracts for enhanced security and flexibility.
 *
 * Key features:
 * - Deposit ERC1155 tokens
 * - Create time-bound proofs of ownership
 * - Verify and use proofs
 * - Withdraw tokens (owner only)
 * - Integration with IdentityManager for DID-based access control
 */
contract ERC1155ProofOfFunds is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, ERC1155Holder {

    struct Proof {
        uint256 tokenId;
        uint256 amount;
        uint256 expirationTime;
        bool isUsed;
    }

    IERC1155 public tokenContract;
    mapping(bytes32 => Proof) public proofs;
    IdentityManager public identityManager;

    event ProofCreated(bytes32 indexed proofId, uint256 tokenId, uint256 amount, uint256 expirationTime);
    event ProofUsed(bytes32 indexed proofId, address user);
    event Deposited(address indexed depositor, uint256 tokenId, uint256 amount);
    event Withdrawn(address indexed owner, uint256 tokenId, uint256 amount);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }

    /**
     * @notice Initializes the contract with the ERC1155 token and IdentityManager addresses
     * @dev This function is called once during contract deployment
     * @param _tokenContract Address of the ERC1155 token to be used for proofs of funds
     * @param _identityManager Address of the IdentityManager contract for access control
     */
    function initialize(address _tokenContract, address _identityManager) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        tokenContract = IERC1155(_tokenContract);
        identityManager = IdentityManager(_identityManager);
    }

    /**
     * @notice Allows a user to deposit ERC1155 tokens into the contract
     * @dev Requires approval for token transfer before calling this function
     * @param tokenId The ID of the token to deposit
     * @param amount The amount of tokens to deposit
     */
    function deposit(uint256 tokenId, uint256 amount) external onlyDIDOwner(msg.sender) nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        tokenContract.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        emit Deposited(msg.sender, tokenId, amount);
    }

    /**
     * @notice Creates a new proof of ownership
     * @dev Only callable by DID owners or delegates
     * @param tokenId The ID of the token to include in the proof
     * @param amount The amount of tokens to include in the proof
     * @param duration The duration (in seconds) for which the proof is valid
     * @return bytes32 The unique identifier of the created proof
     */
    function createProof(uint256 tokenId, uint256 amount, uint256 duration) external onlyDIDOwner(msg.sender) returns (bytes32) {
        require(tokenContract.balanceOf(address(this), tokenId) >= amount, "Insufficient tokens in contract");
        uint256 expirationTime = block.timestamp + duration;
        bytes32 proofId = keccak256(abi.encodePacked(msg.sender, tokenId, amount, expirationTime));
        
        proofs[proofId] = Proof(tokenId, amount, expirationTime, false);
        
        emit ProofCreated(proofId, tokenId, amount, expirationTime);
        return proofId;
    }

    /**
     * @notice Verifies and uses a proof of ownership
     * @dev Marks the proof as used after successful verification
     * @param proofId The unique identifier of the proof to use
     */
    function useProof(bytes32 proofId) external nonReentrant {
        Proof storage proof = proofs[proofId];
        require(proof.amount > 0, "Proof does not exist");
        require(!proof.isUsed, "Proof has already been used");
        require(block.timestamp <= proof.expirationTime, "Proof has expired");

        proof.isUsed = true;
        emit ProofUsed(proofId, msg.sender);
    }

    /**
     * @notice Allows the owner to withdraw ERC1155 tokens from the contract
     * @dev Only callable by the contract owner
     * @param tokenId The ID of the token to withdraw
     * @param amount The amount of tokens to withdraw
     */
    function withdraw(uint256 tokenId, uint256 amount) external onlyOwner nonReentrant {
        require(tokenContract.balanceOf(address(this), tokenId) >= amount, "Insufficient tokens in contract");
        tokenContract.safeTransferFrom(address(this), owner(), tokenId, amount, "");
        emit Withdrawn(owner(), tokenId, amount);
    }

    /**
     * @notice Checks the balance of a specific ERC1155 token held by the contract
     * @param tokenId The ID of the token to check
     * @return uint256 The balance of the specified token held by the contract
     */
    function getBalance(uint256 tokenId) public view returns (uint256) {
        return tokenContract.balanceOf(address(this), tokenId);
    }
}