// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title Escrow smart contract.
 * @author astor@swtch.network
 * @notice The depositor is the address that deploys the contract.
 * The beneficiary and arbiter addresses are set at contract deployment.
 */
contract Escrow {
  address public depositor;
  address public beneficiary;
  address public arbiter;
  address public reputationManager;

  /**
   * Constructor
   * @param _beneficiary  Party receiving the funds.
   * @param _arbiter Party providing arbitration of the funds.
   */
  constructor(address _beneficiary, address _arbiter) {
    depositor = msg.sender;
    beneficiary = _beneficiary;
    arbiter = _arbiter;
  }

  function setReputationManager(address _reputationManager) external {
    require(msg.sender == depositor, "Only depositor can set ReputationManager");
    reputationManager = _reputationManager;
  }

  /**
   * deposit function allows the depositor to send Ether to the contract.
   */
  function deposit() external payable {
    require(msg.sender == depositor || msg.sender == reputationManager, "Sender must be the depositor or ReputationManager");
  }

  /**
   * releaseToBeneficiary function allows the arbiter to send all the contract's Ether to the beneficiary.
   */
  function releaseToBeneficiary() external {
    require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can release funds");
    payable(beneficiary).transfer(address(this).balance);
  }

  /**
   * refundToDepositor function allows the arbiter to refund the Ether to the depositor.
   */
  function refundToDepositor() external {
    require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can refund funds");
    payable(depositor).transfer(address(this).balance);
  }

  /**
   * getBalance function returns the contract's Ether balance.
   */
  function getBalance() public view returns (uint) {
    return address(this).balance;
  }
}
