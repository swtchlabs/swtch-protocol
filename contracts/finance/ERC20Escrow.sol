// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title ERC20Escrow
 * @author astor@swtch.network
 * @notice ERC20Escrow is responsible for managing an escrow exchange using ERC20 tokens.
 */
contract ERC20Escrow {
    address public depositor;
    address public beneficiary;
    address public arbiter;
    address public reputationManager;
    IERC20 public token;
    uint256 public depositAmount;

    constructor(address _token, address _beneficiary, address _arbiter) {
        depositor = msg.sender;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
        token = IERC20(_token);
    }

    function setReputationManager(address _reputationManager) external {
        require(msg.sender == depositor, "Only depositor can set ReputationManager");
        reputationManager = _reputationManager;
    }

    function deposit(uint256 amount) external {
        require(msg.sender == reputationManager, "Only ReputationManager can deposit");
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance in escrow");
        depositAmount = amount;
    }

    function releaseToBeneficiary() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can release funds");
        require(token.transfer(beneficiary, depositAmount), "Transfer failed");
    }

    function refundToDepositor() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can refund funds");
        require(token.transfer(depositor, depositAmount), "Transfer failed");
    }

    function getBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
