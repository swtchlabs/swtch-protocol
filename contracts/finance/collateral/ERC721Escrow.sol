// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../../did/IdentityManager.sol";

/**
 * @title ERC721Escrow
 * @author astor@swtch.network
 * @notice ERC721Escrow is responsible for managing an escrow exchange using ERC721 tokens.  
 */
contract ERC721Escrow is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    address public depositor;
    address public beneficiary;
    address public arbiter;
    IdentityManager public identityManager;

    IERC721 public nft;
    uint256 public tokenId;

    event Deposited(address indexed sender, uint256 tokenId);
    event Released(address indexed recipient, uint256 tokenId);
    event Refunded(address indexed recipient, uint256 tokenId);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }

    /**
     * @dev Initializes the escrow contract with the main participants and required addresses.
     * @param _nft Token address of the ERC721 collateral token.
     * @param _tokenId Token id of the collateral token.
     * @param _depositor The address of the party depositing funds into escrow.
     * @param _beneficiary The address of the party receiving funds if the escrow is successfully completed.
     * @param _arbiter The address of the party authorized to release or refund the escrowed funds.
     * @param _identityManager The address of the IdentityManager contract for access control.
     */
    function initialize(address _nft, uint256 _tokenId, address _depositor, address _beneficiary, address _arbiter, address _identityManager) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        depositor = _depositor;
        tokenId = _tokenId;
        beneficiary = _beneficiary;
        arbiter = _arbiter;

        nft = IERC721(_nft);
        identityManager = IdentityManager(_identityManager);
    }

    /**
     * @dev Allows the depositor to deposit the NFT into the escrow.
     * @notice This function can only be called by the registered depositor.
     * Emits a Deposited event upon successful deposit.
     */
    function deposit() external onlyDIDOwner(depositor) nonReentrant {
        address currentOwner = nft.ownerOf(tokenId);
        require(currentOwner == depositor, "Depositor must own the NFT");
        nft.transferFrom(currentOwner, address(this), tokenId);
        emit Deposited(msg.sender, tokenId);
    }

    /**
     * @dev Allows the arbiter to release the escrowed NFT to the beneficiary.
     * @notice This function can only be called by the registered arbiter.
     * Emits a Released event upon successful fund release.
     */
    function releaseToBeneficiary() external onlyDIDOwner(arbiter) nonReentrant {
        nft.transferFrom(address(this), beneficiary, tokenId);
        emit Released(beneficiary, tokenId);
    }

    /**
     * @dev Allows the arbiter to refund the escrowed NFT back to the depositor.
     * @notice This function can only be called by the registered arbiter.
     * Emits a Refunded event upon successful refund.
     */
    function refundToDepositor() external onlyDIDOwner(arbiter) nonReentrant {
        nft.transferFrom(address(this), depositor, tokenId);
        emit Refunded(depositor, tokenId);
    }

    function getDepositor() public view returns (address) {
        return depositor;
    }
}
