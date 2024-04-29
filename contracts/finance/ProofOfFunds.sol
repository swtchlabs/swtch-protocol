// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title ProofOfFunds
 * @author astor@swtch.network
 * @notice ProofOfFunds is responsible for managing a proof of funds exchange using native ether cryptocurrency. 
 */
contract ProofOfFunds {
  address public owner;
  uint public lockTime;

  uint public constant second = 1 seconds;
  uint public constant minute = 1 minutes;

  constructor() {
    owner = msg.sender;
  }

  // Deposit Ether into the contract and set a lock time
  /**
   * deposit: Allows the owner to deposit Ether into the contract. The require statement ensures a positive amount is deposited.
   */
  function deposit() external payable {
    require(msg.value > 0, "Deposit amount must be greater than 0");
  }

  /**
   * setLockTime: The owner can call this function to set the duration (in seconds) for which the funds should be locked.
   * @param _timeInSeconds duration (in seconds) for which the funds should be locked.
   */
  function setLockTime(uint _timeInSeconds) external {
    require(msg.sender == owner, "Only owner can set the lock time");
    lockTime = block.timestamp + _timeInSeconds;
  }

  // Withdraw funds after the lock time has passed
  /**
   * withdraw: Allows the owner to withdraw the funds, but only if the current timestamp is greater than or equal to the lockTime.
   */
  function withdraw() external {
    require(msg.sender == owner, "Only owner can withdraw funds");
    require(block.timestamp >= lockTime, "Funds are locked");
    payable(owner).transfer(address(this).balance);
  }

  // Get the contract's Ether balance
  /**
   * getBalance: Returns the contract's Ether balance.
   */
  function getBalance() public view returns (uint) {
    return address(this).balance;
  }

}