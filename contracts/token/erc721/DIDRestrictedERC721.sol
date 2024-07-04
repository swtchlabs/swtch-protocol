// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "../../did/IdentityManager.sol";

contract DIDRestrictedERC721 is ERC721, ERC721Burnable {
    
    IdentityManager private identityManager;

    constructor(string memory name, string memory symbol, address identityManagerAddress)
        ERC721(name, symbol) {
        identityManager = IdentityManager(identityManagerAddress);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal view {
        require(tokenId > 0, "Invalid tokenId");
        // Allow minting and burning (from and to zero address)
        if (from != address(0) && to != address(0)) {
            require(identityManager.isOwnerOrDelegate(from, from), "Sender is not a registered DID");
            require(identityManager.isOwnerOrDelegate(to, to), "Recipient is not a registered DID");
        }
    }

    function burn(uint256 tokenId) public override {
        address owner = ownerOf(tokenId);
        require(identityManager.isOwnerOrDelegate(owner, owner), "Caller is not token owner or delegate");
        super.burn(tokenId);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
