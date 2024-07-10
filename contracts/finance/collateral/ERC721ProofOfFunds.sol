// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../../did/IdentityManager.sol";

/**
 * @title ERC721ProofOfFunds
 * @notice ERC721ProofOfFunds is responsible for managing proof of funds using ERC721 tokens (NFTs).
 * This contract allows users to deposit ERC721 tokens, create proofs of ownership, and verify these proofs.
 * It integrates with an IdentityManager for access control and is designed to be upgradeable.
 *
 * @dev This contract inherits from Initializable, OwnableUpgradeable, and ReentrancyGuardUpgradeable.
 * It uses OpenZeppelin's upgradeable contracts for enhanced security and flexibility.
 *
 * Key features:
 * - Deposit ERC721 tokens
 * - Create time-bound proofs of ownership
 * - Verify and use proofs
 * - Withdraw tokens (owner only)
 * - Integration with IdentityManager for DID-based access control
 */
contract ERC721ProofOfFunds is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    
    struct Proof {
        uint256 tokenId;
        uint256 expirationTime;
        bool isUsed;
    }

    IERC721 public nftContract;
    mapping(bytes32 => Proof) public proofs;
    IdentityManager public identityManager;

    event ProofCreated(bytes32 indexed proofId, uint256 tokenId, uint256 expirationTime);
    event ProofUsed(bytes32 indexed proofId, address user);
    event Deposited(address indexed depositor, uint256 tokenId);
    event Withdrawn(address indexed owner, uint256 tokenId);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }

    /**
     * @notice Initializes the contract with the ERC721 token and IdentityManager addresses
     * @dev This function is called once during contract deployment
     * @param _nftContract Address of the ERC721 token to be used for proofs of funds
     * @param _identityManager Address of the IdentityManager contract for access control
     */
    function initialize(address _nftContract, address _identityManager) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        nftContract = IERC721(_nftContract);
        identityManager = IdentityManager(_identityManager);
    }

    /**
     * @notice Allows a user to deposit an ERC721 token into the contract
     * @dev Requires approval for token transfer before calling this function
     * @param tokenId The ID of the token to deposit
     */
    function deposit(uint256 tokenId) external onlyDIDOwner(msg.sender) nonReentrant {
        nftContract.transferFrom(msg.sender, address(this), tokenId);
        emit Deposited(msg.sender, tokenId);
    }

    /**
     * @notice Creates a new proof of ownership
     * @dev Only callable by DID owners or delegates
     * @param tokenId The ID of the token to include in the proof
     * @param duration The duration (in seconds) for which the proof is valid
     * @return bytes32 The unique identifier of the created proof
     */
    function createProof(uint256 tokenId, uint256 duration) external onlyDIDOwner(msg.sender) returns (bytes32) {
        require(nftContract.ownerOf(tokenId) == address(this), "Token not deposited in contract");
        uint256 expirationTime = block.timestamp + duration;
        bytes32 proofId = keccak256(abi.encodePacked(msg.sender, tokenId, expirationTime));
        
        proofs[proofId] = Proof(tokenId, expirationTime, false);
        
        emit ProofCreated(proofId, tokenId, expirationTime);
        return proofId;
    }

    /**
     * @notice Verifies and uses a proof of ownership
     * @dev Marks the proof as used after successful verification
     * @param proofId The unique identifier of the proof to use
     */
    function useProof(bytes32 proofId) external nonReentrant {
        Proof storage proof = proofs[proofId];
        require(proof.tokenId != 0, "Proof does not exist");
        require(!proof.isUsed, "Proof has already been used");
        require(block.timestamp <= proof.expirationTime, "Proof has expired");

        proof.isUsed = true;
        emit ProofUsed(proofId, msg.sender);
    }

    /**
     * @notice Allows the owner to withdraw a specific NFT from the contract
     * @dev Only callable by the contract owner
     * @param tokenId The ID of the token to withdraw
     */
    function withdraw(uint256 tokenId) external onlyOwner nonReentrant {
        require(nftContract.ownerOf(tokenId) == address(this), "Token not owned by contract");
        nftContract.transferFrom(address(this), owner(), tokenId);
        emit Withdrawn(owner(), tokenId);
    }

    /**
     * @notice Checks if a specific NFT is held by the contract
     * @param tokenId The ID of the token to check
     * @return bool True if the contract holds the token, false otherwise
     */
    function isTokenDeposited(uint256 tokenId) public view returns (bool) {
        return nftContract.ownerOf(tokenId) == address(this);
    }
}