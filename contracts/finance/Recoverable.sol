// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title Recoverable
 * @author astor@swtch.network
 * @notice Recoverable provides a recovery mechanism for ERC20 smart contracts.
 */
contract Recoverable {

    function recover(address token) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        // need to use the owner vs msg.sender
        require(IERC20(token).transfer(msg.sender, balance), "Transfer failed");
    }

}