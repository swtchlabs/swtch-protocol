// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../../did/IdentityManager.sol";

/**
 * @title ReputableEscrow
 * @dev SWTCH ReputableEscrow smart contract extends the basic Escrow functionality by integrating with a ReputationManager.
 * It allows for secure fund transfers between parties with arbitration, while also updating
 * reputation scores based on actions taken within the escrow process.
 *
 * @notice This contract provides a trust-enhanced escrow service. Actions like depositing, releasing funds,
 * and refunding are reflected in the participants' reputation scores, promoting good behavior.
 */
contract ReputableEscrow is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    address public depositor;
    address public beneficiary;
    address public arbiter;
    address public reputationManager;
    
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

    function setReputationManager(address _reputationManager) external onlyOwner {
        reputationManager = _reputationManager;
    }

    /**
     * @dev Allows the depositor to deposit funds into the escrow.
     * @notice This function can only be called by the registered depositor.
     * Emits a Deposited event upon successful deposit.
     */
    function deposit() external payable onlyDIDOwner(depositor) nonReentrant {
        require(msg.sender == depositor || msg.sender == reputationManager, "Sender must be the depositor or ReputationManager");
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Allows the arbiter to release the escrowed funds to the beneficiary.
     * @notice This function can only be called by the registered arbiter.
     * Emits a Released event upon successful fund release.
     */
    function releaseToBeneficiary() external onlyDIDOwner(arbiter) nonReentrant {
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can release funds");
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
        require(msg.sender == arbiter || msg.sender == reputationManager, "Only arbiter or ReputationManager can refund funds");
        uint256 amount = address(this).balance;
        payable(depositor).transfer(amount);
        emit Refunded(depositor, amount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}