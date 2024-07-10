// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../../did/IdentityManager.sol";

/**
 * @title Billable
 * @author astor@swtch.network
 * @dev A contract for managing billable services with decentralized identity integration.
 *
 * This contract allows for:
 * - Setting and adjusting service fees
 * - Collecting fees from users
 * - Tracking individual user balances
 * - Withdrawing collected fees
 *
 * It integrates with an IdentityManager for DID-based access control.
 *
 * @notice This contract is upgradeable and uses OpenZeppelin's upgradeable contracts.

 */
contract Billable is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    IdentityManager private identityManager;

    uint256 private _fee;
    uint256 private _totalCollected;
    mapping(address => uint256) private _userBalances;

    event FeesAdjusted(address indexed adjuster, uint256 oldFee, uint256 newFee, uint256 timestamp);
    event FeeCollected(address indexed payer, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed recipient, uint256 amount, uint256 timestamp);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Only DID owner can perform this action");
        _;
    }

    function initialize(uint256 serviceFee, address _identityManagerAddress) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        _fee = serviceFee;
        identityManager = IdentityManager(_identityManagerAddress);
    }

    function getFee() public view returns(uint256) {
        return _fee;
    }

    function getTotalCollected() public view returns(uint256) {
        return _totalCollected;
    }

    function getUserBalance(address user) public view returns(uint256) {
        return _userBalances[user];
    }

    function adjustFees(uint256 _adjustedFee) public onlyDIDOwner(msg.sender) {
        require(_adjustedFee > 0, "Fee must be greater than zero");
        uint256 oldFee = _fee;
        _fee = _adjustedFee;
        emit FeesAdjusted(msg.sender, oldFee, _adjustedFee, block.timestamp);
    }

    function collectFee() public payable nonReentrant {
        require(msg.value == _fee, "Fee not met");
        _totalCollected += msg.value;
        _userBalances[msg.sender] += msg.value;
        emit FeeCollected(msg.sender, msg.value, block.timestamp);
    }

    function withdraw(address payable recipient) public onlyDIDOwner(msg.sender) nonReentrant {
        require(identityManager.isOwnerOrDelegate(recipient, recipient), "Recipient must be a valid DID owner or delegate");
        uint256 balance = _userBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        _userBalances[msg.sender] = 0;
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "Transfer failed");
        emit Withdrawn(recipient, balance, block.timestamp);
    }

    function withdrawAll() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        emit Withdrawn(owner(), balance, block.timestamp);
    }

    receive() external payable {
        collectFee();
    }

    fallback() external payable {
        collectFee();
    }
}