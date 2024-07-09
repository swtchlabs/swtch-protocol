// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../../did/IdentityManager.sol";

/**
 * @title Escrow
 * @author astor@swtch.network
 * @dev SWTCH Escrow smart contract manages a simple escrow service where funds can be deposited by a depositor, and released to a beneficiary or refunded to the depositor by an arbiter.
 * It uses an IdentityManager for access control.
 *
 * @notice This contract allows for secure fund transfers between parties with arbitration.
 * It's designed to be upgradeable and uses OpenZeppelin's upgradeable contracts.
 */
contract Escrow is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    address public depositor;
    address public beneficiary;
    address public arbiter;
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
     * @param _depositor The address of the party depositing funds into escrow.
     * @param _beneficiary The address of the party receiving funds if the escrow is successfully completed.
     * @param _arbiter The address of the party authorized to release or refund the escrowed funds.
     * @param _identityManager The address of the IdentityManager contract for access control.
     */
    function initialize(address _depositor, address _beneficiary, address _arbiter, address _identityManager) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        depositor = _depositor;
        beneficiary = _beneficiary;
        arbiter = _arbiter;
        identityManager = IdentityManager(_identityManager);
    }

    /**
     * @dev Allows the depositor to deposit funds into the escrow.
     * @notice This function can only be called by the registered depositor.
     * Emits a Deposited event upon successful deposit.
     */
    function deposit() external payable onlyDIDOwner(depositor) nonReentrant {
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Allows the arbiter to release the escrowed funds to the beneficiary.
     * @notice This function can only be called by the registered arbiter.
     * Emits a Released event upon successful fund release.
     */
    function releaseToBeneficiary() external onlyDIDOwner(arbiter) nonReentrant {
        uint256 amount = address(this).balance;
        payable(beneficiary).transfer(amount);
        emit Released(beneficiary, amount);
    }

    /**
     * @dev Allows the arbiter to refund the escrowed funds back to the depositor.
     * @notice This function can only be called by the registered arbiter.
     * Emits a Refunded event upon successful refund.
     */
    function refundToDepositor() external onlyDIDOwner(arbiter) nonReentrant {
        uint256 amount = address(this).balance;
        payable(depositor).transfer(amount);
        emit Refunded(depositor, amount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}