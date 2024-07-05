// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../../did/IdentityManager.sol";

contract DIDRestrictedERC1155 is ERC1155, ERC1155Burnable, ReentrancyGuard {
    
    IdentityManager private identityManager;

    constructor(string memory uri, address identityManagerAddress)
        ERC1155(uri) {
        identityManager = IdentityManager(identityManagerAddress);
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public {
        require(identityManager.isOwnerOrDelegate(msg.sender, msg.sender), "Minter is not a registered DID");
        require(identityManager.isOwnerOrDelegate(account, account), "Account is not a registered DID");
        _mint(account, id, amount, data);
    }

    function burn(address account, uint256 id, uint256 amount)
        public override {
        require(identityManager.isOwnerOrDelegate(account, account), "Account is not a registered DID");
        super.burn(account, id, amount);
    }
    
    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal view {
        require(operator == address(0) || identityManager.isOwnerOrDelegate(operator, operator), "Operator is not a registered DID");
        require(from == address(0) || identityManager.isOwnerOrDelegate(from, from), "Sender is not a registered DID");
        require(to == address(0) || identityManager.isOwnerOrDelegate(to, to), "Recipient is not a registered DID");
        require(ids.length > 0, "No token ids provided");
        require(amounts.length > 0, "No amounts provided");
        require(data.length > 0, "No data provided");
        
        // super._beforeTokenTransfer(operator, from, to, ids, amounts, data);  // No need for this line if it's base ERC1155
    }
}
