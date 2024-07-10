// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {

    constructor(uint256 _totalSupply) ERC20("Mock ERC20 Token", "MERC20") {
        _mint(msg.sender, _totalSupply);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
