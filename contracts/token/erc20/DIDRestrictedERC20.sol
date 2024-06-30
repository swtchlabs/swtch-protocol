// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

import "../../id/IdentityManager.sol";

contract DIDRestrictedERC20 is ERC20, ERC20Burnable {

    IdentityManager private identityManager;

    event Burn(address indexed burner, uint256 amount);
    event Mint(address indexed recipient, uint256 amount);

    constructor(string memory name, string memory symbol, address _identityManagerAddress) 
    ERC20(name, symbol) {
        identityManager = IdentityManager(_identityManagerAddress);
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(identityManager.isOwnerOrDelegate(msg.sender, msg.sender), "Sender is not a registered DID");
        require(identityManager.isOwnerOrDelegate(recipient, recipient), "Recipient is not a registered DID");
        return super.transfer(recipient, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        require(identityManager.isOwnerOrDelegate(sender, recipient), "Sender is not a registered DID");
        require(identityManager.isOwnerOrDelegate(recipient, recipient), "Recipient is not a registered DID");
        return super.transferFrom(sender, recipient, amount);
    }

    function burn(uint256 amount) public override {
        super.burn(amount);
        emit Burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public override {
        require(identityManager.isOwnerOrDelegate(account, account), "Account is not a registered DID");
        super.burnFrom(account, amount);
        emit Burn(account, amount);
    }

    function mint(address recipient, uint256 amount) external  {
        require(identityManager.isOwnerOrDelegate(recipient, recipient), "Account is not a registered DID");
        _mint(recipient, amount);

        emit Mint(recipient, amount);
    }
}
