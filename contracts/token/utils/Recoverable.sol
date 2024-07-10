// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Recoverable is Initializable, OwnableUpgradeable {

    event TokensRecovered(address indexed token, address indexed to, uint256 amount);
    event ETHRecovered(address indexed to, uint256 amount);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    /**
     * @dev Recovers multiple ERC20 tokens sent to this contract.
     * @param tokens Array of ERC20 token addresses to recover
     * @param to Address to send recovered tokens to
     */
    function recoverTokens(address[] calldata tokens, address to) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20 token = IERC20(tokens[i]);
            uint256 balance = token.balanceOf(address(this));
            if (balance > 0) {
                token.transfer(to, balance);
                emit TokensRecovered(tokens[i], to, balance);
            }
        }
    }

    /**
     * @dev Recovers native ETH sent to this contract.
     * @param to Address to send recovered ETH to
     */
    function recoverETH(address payable to) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to recover");
        (bool success, ) = to.call{value: balance}("");
        require(success, "ETH transfer failed");
        emit ETHRecovered(to, balance);
    }

    /**
     * @dev Allows the contract to receive ETH.
     */
    receive() external payable {}
}
