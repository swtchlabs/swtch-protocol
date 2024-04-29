// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC20 {
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

/**
 * @title ERC20ProofOfFunds
 * @author astor@swtch.network
 * @notice ERC20ProofOfFunds is responsible for managing a proof of funds exchange using ERC20 tokens. 
 */
contract ERC20ProofOfFunds {
  address public owner;
  IERC20 public token;
  uint256 public lockTime;
  uint256 public lockedAmount;

  constructor(address _token) {
    owner = msg.sender;
    token = IERC20(_token);
  }

  function deposit(uint256 amount, uint256 timeInSeconds) external {
    require(msg.sender == owner, "Only owner can deposit tokens");
    require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    lockedAmount = amount;
    lockTime = block.timestamp + timeInSeconds;
  }

  function withdraw() external {
    require(msg.sender == owner, "Only owner can withdraw tokens");
    require(block.timestamp >= lockTime, "Tokens are still locked");
    require(token.transfer(owner, lockedAmount), "Transfer failed");
    lockedAmount = 0;
  }

  function getBalance() public view returns (uint256) {
    return token.balanceOf(address(this));
  }
}
