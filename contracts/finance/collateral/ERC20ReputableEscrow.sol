// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title ERC20ReputableEscrow
 * @author astor@swtch.network
 * @dev ERC20ReputableEscrow is responsible for managing an escrow exchange using ERC20 tokens.
 */
contract ERC20ReputableEscrow is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    address public depositor;
    address public beneficiary;
    address public arbiter;
    address public reputationManager;
    IERC20 public token;
    uint256 public depositAmount;

    event Deposited(address indexed sender, uint256 amount);
    event Released(address indexed recipient, uint256 amount);
    event Refunded(address indexed recipient, uint256 amount);


    /**
     * @dev Initializes the escrow contract with the main participants and required addresses.
     * @param _token Token address of the ERC20 collateral token.
     * @param _depositor The address of the party depositing funds into escrow.
     * @param _beneficiary The address of the party receiving funds if the escrow is successfully completed.
     * @param _arbiter The address of the party authorized to release or refund the escrowed funds.
     */
    function initialize(address _token, address _depositor, address _beneficiary, address _arbiter) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        depositor = _depositor;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
        token = IERC20(_token);
    }

    function setReputationManager(address _reputationManager) external {
        require(msg.sender == depositor, "Only depositor can set ReputationManager");
        reputationManager = _reputationManager;
    }

    /**
     * @dev Allows the ReputationManager to deposit funds into the escrow.
     * @param amount Number of tokens to deposit.
     * @notice This function can only be called by the registered depositor or ReputationManager.
     * Emits a Deposited event upon successful deposit.
     */
    function deposit(uint256 amount) external {
        require(msg.sender == reputationManager, "Only ReputationManager can deposit");
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance in escrow");
        depositAmount = amount;
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Allows the arbiter or ReputationManager to release the escrowed funds to the beneficiary.
     * @notice This function can only be called by the registered arbiter or ReputationManager.
     * Emits a Released event upon successful fund release.
     */
    function releaseToBeneficiary() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can release funds");
        require(token.transfer(beneficiary, depositAmount), "Transfer failed");
        emit Released(beneficiary, depositAmount);
    }

    /**
     * @dev Allows the arbiter or ReputationManager to refund the escrowed funds back to the depositor.
     * @notice This function can only be called by the registered arbiter or ReputationManager.
     * Emits a Refunded event upon successful refund.
     */
    function refundToDepositor() external {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can refund funds");
        require(token.transfer(depositor, depositAmount), "Transfer failed");
        emit Refunded(depositor, depositAmount);
    }

    function getBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
