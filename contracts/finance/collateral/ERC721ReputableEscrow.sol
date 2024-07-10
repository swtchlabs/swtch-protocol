// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title ERC721ReputableEscrow
 * @author astor@swtch.network
 * @notice ERC721Escrow is responsible for managing an escrow exchange using ERC721 tokens.  
 */
contract ERC721ReputableEscrow is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    address public depositor;
    address public beneficiary;
    address public arbiter;
    address public reputationManager;

    IERC721 public nft;
    uint256 public tokenId;

    event Deposited(address indexed sender, uint256 tokenId);
    event Released(address indexed recipient, uint256 tokenId);
    event Refunded(address indexed recipient, uint256 tokenId);

    /**
     * @dev Initializes the escrow contract with the main participants and required addresses.
     * @param _nft Token address of the ERC721 collateral token.
     * @param _tokenId Token id of the collateral token.
     * @param _depositor The address of the party depositing funds into escrow.
     * @param _beneficiary The address of the party receiving funds if the escrow is successfully completed.
     * @param _arbiter The address of the party authorized to release or refund the escrowed funds.
     */
    function initialize(address _nft, uint256 _tokenId, address _depositor, address _beneficiary, address _arbiter) public initializer {
        depositor = _depositor;
        tokenId = _tokenId;
        beneficiary = _beneficiary;
        arbiter = _arbiter;

        nft = IERC721(_nft);
    }

    function setReputationManager(address _reputationManager) external {
        require(msg.sender == depositor, "Only depositor can set ReputationManager");
        reputationManager = _reputationManager;
    }

    /**
     * @dev Allows the depositor or ReputationManager to deposit the NFT into the escrow.
     * @notice This function can only be called by the registered depositor or ReputationManager.
     * Emits a Deposited event upon successful deposit.
     */
    function deposit() external {
        require(msg.sender == depositor || msg.sender == reputationManager, "Only depositor or ReputationManager can deposit the NFT");
        address currentOwner = nft.ownerOf(tokenId);
        require(currentOwner == depositor, "Depositor must own the NFT");
        nft.transferFrom(currentOwner, address(this), tokenId);
        emit Deposited(msg.sender, tokenId);
    }

    /**
     * @dev Allows the arbiter or ReputationManager to release the escrowed NFT to the beneficiary.
     * @notice This function can only be called by the registered arbiter or ReputationManager.
     * Emits a Released event upon successful fund release.
     */
    function releaseToBeneficiary() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can release the NFT");
        nft.transferFrom(address(this), beneficiary, tokenId);
        emit Released(beneficiary, tokenId);
    }

    /**
     * @dev Allows the arbiter or ReputationManager to refund the escrowed NFT back to the depositor.
     * @notice This function can only be called by the registered arbiter or ReputationManager.
     * Emits a Refunded event upon successful refund.
     */
    function refundToDepositor() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can refund the NFT");
        nft.transferFrom(address(this), depositor, tokenId);
        emit Refunded(depositor, tokenId);
    }

    function getDepositor() public view returns (address) {
        return depositor;
    }
}
