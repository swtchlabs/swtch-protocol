// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

import "hardhat/console.sol";

/**
 * @title ERC721Escrow
 * @author astor@swtch.network
 * @notice ERC721Escrow is responsible for managing an escrow exchange using ERC721 tokens.  
 */
contract ERC721Escrow {

    address public depositor;
    address public beneficiary;
    address public arbiter;
    address public reputationManager;

    IERC721 public nft;
    uint256 public tokenId;

    constructor(address _nft, uint256 _tokenId, address _beneficiary, address _arbiter) {
        depositor = msg.sender;
        nft = IERC721(_nft);
        tokenId = _tokenId;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
    }

    function setReputationManager(address _reputationManager) external {
        require(msg.sender == depositor, "Only depositor can set ReputationManager");
        reputationManager = _reputationManager;
    }

    function deposit() external {
        require(msg.sender == depositor || msg.sender == reputationManager, "Only depositor or ReputationManager can deposit the NFT");
        address currentOwner = nft.ownerOf(tokenId);
        require(currentOwner == depositor, "Depositor must own the NFT");
        nft.transferFrom(currentOwner, address(this), tokenId);
    }

    function releaseToBeneficiary() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can release the NFT");
        nft.transferFrom(address(this), beneficiary, tokenId);
    }

    function refundToDepositor() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can refund the NFT");
        nft.transferFrom(address(this), depositor, tokenId);
    }

    function getDepositor() public view returns (address) {
        return depositor;
    }
}
