// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title ERC721Escrow
 * @author astor@swtch.network
 * @notice ERC721Escrow is responsible for managing an escrow exchange using ERC721 tokens.  
 */
contract ERC721Escrow {

    address public depositor;
    address public beneficiary;
    address public arbiter;
    IERC721 public nft;
    uint256 public tokenId;

    constructor(address _nft, uint256 _tokenId, address _beneficiary, address _arbiter) {
        depositor = msg.sender;
        nft = IERC721(_nft);
        tokenId = _tokenId;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
    }

    function deposit() external {
        require(msg.sender == depositor, "Only depositor can deposit the NFT");
        require(nft.ownerOf(tokenId) == msg.sender, "Depositor must own the NFT");
        nft.transferFrom(depositor, address(this), tokenId);
    }

    function releaseToBeneficiary() external {
        require(msg.sender == arbiter, "Only arbiter can release the NFT");
        nft.transferFrom(address(this), beneficiary, tokenId);
    }

    function refundToDepositor() external {
        require(msg.sender == arbiter, "Only arbiter can refund the NFT");
        nft.transferFrom(address(this), depositor, tokenId);
    }
}
