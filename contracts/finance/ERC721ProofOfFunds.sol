// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title ERC721ProofOfFunds
 * @author astor@swtch.network
 * @notice ERC721ProofOfFunds is responsible for managing a proof of funds exchange using ERC721 tokens.  
 */
contract ERC721ProofOfFunds {
  address public owner;
  IERC721 public nft;
  uint256 public tokenId;
  uint256 public lockTime;

  constructor(address _nft, uint256 _tokenId) {
    owner = msg.sender;
    nft = IERC721(_nft);
    tokenId = _tokenId;
  }

  function deposit(uint256 timeInSeconds) external {
    require(msg.sender == owner, "Only owner can deposit the NFT");
    require(nft.ownerOf(tokenId) == msg.sender, "Depositor must own the NFT");
    nft.transferFrom(msg.sender, address(this), tokenId);
    lockTime = block.timestamp + timeInSeconds;
  }

  function withdraw() external {
    require(msg.sender == owner, "Only owner can withdraw the NFT");
    require(block.timestamp >= lockTime, "NFT is still locked");
    nft.transferFrom(address(this), owner, tokenId);
  }

  function isLocked() public view returns (bool) {
    return block.timestamp < lockTime;
  }

}
