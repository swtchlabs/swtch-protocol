// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../../did/IdentityManager.sol";


/**
 * @title ERC20Escrow
 * @author astor@swtch.network
 * @notice ERC20Escrow is responsible for managing an escrow exchange using ERC20 tokens.
 */
contract ERC20Escrow is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable{
    address public depositor;
    address public beneficiary;
    address public arbiter;
    IERC20 public token;
    uint256 public depositAmount;
    IdentityManager public identityManager;

    event Deposited(address indexed sender, uint256 amount);
    event Released(address indexed recipient, uint256 amount);
    event Refunded(address indexed recipient, uint256 amount);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }

    /**
     * @dev Initializes the escrow contract with the main participants and required addresses.
     * @param _token Token address of the ERC20 collateral token.
     * @param _depositor The address of the party depositing funds into escrow.
     * @param _beneficiary The address of the party receiving funds if the escrow is successfully completed.
     * @param _arbiter The address of the party authorized to release or refund the escrowed funds.
     * @param _identityManager The address of the IdentityManager contract for access control.
     */
    function initialize(address _token, address _depositor, address _beneficiary, address _arbiter, address _identityManager) public initializer {
        depositor = _depositor;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
        token = IERC20(_token);
        identityManager = IdentityManager(_identityManager);
    }

    /**
     * @dev Allows the depositor to deposit funds into the escrow.
     * @notice This function can only be called by the registered depositor.
     * Emits a Deposited event upon successful deposit.
     */
    function deposit(uint256 amount) external onlyDIDOwner(depositor) nonReentrant {
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance in escrow");
        depositAmount = amount;
        emit Deposited(msg.sender, depositAmount);
    }

    /**
     * @dev Allows the arbiter to release the escrowed funds to the beneficiary.
     * @notice This function can only be called by the registered arbiter.
     * Emits a Released event upon successful fund release.
     */
    function releaseToBeneficiary() external onlyDIDOwner(arbiter) nonReentrant {
        require(token.transfer(beneficiary, depositAmount), "Transfer failed");
        emit Released(beneficiary, depositAmount);
    }

    /**
     * @dev Allows the arbiter to refund the escrowed funds back to the depositor.
     * @notice This function can only be called by the registered arbiter.
     * Emits a Refunded event upon successful refund.
     */
    function refundToDepositor() external onlyDIDOwner(arbiter) nonReentrant {
        require(token.transfer(depositor, depositAmount), "Transfer failed");
         emit Refunded(depositor, depositAmount);
    }

    function getBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
