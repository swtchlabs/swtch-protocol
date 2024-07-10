// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "../../did/IdentityManager.sol";
import "../../utils/cryptography/SignatureVerifier.sol";

/**
 * @title PaymentChannel
 * @author astor@swtch.network
 * @notice PaymentChannel represents a basic ether sender/receiver relationship for payments.
 */
contract PaymentChannel is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, SignatureVerifier {

    IdentityManager public identityManager;

    address payable public sender;
    address payable public receiver;
    uint256 public expiration;
    uint256 public deposit;

    event ChannelOpened(address indexed sender, address indexed receiver, uint256 deposit, uint256 expiration);
    event ChannelClosed(address indexed closer, uint256 amount);
    event ChannelExtended(uint256 newExpiration);
    event TimeoutClaimed(address indexed claimer, uint256 amount);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }

    function initialize(address payable _sender, address payable _receiver, uint256 duration, address _identityManager) public payable initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();

        sender = _sender;
        receiver = _receiver;
        expiration = block.timestamp + duration;
        deposit = msg.value;
        identityManager = IdentityManager(_identityManager);

        emit ChannelOpened(sender, receiver, deposit, expiration);
    }

    function close(address did, uint256 amount, bytes memory signature) external nonReentrant whenNotPaused onlyDIDOwner(did) {
        require(msg.sender == receiver, "Only receiver can close the channel");
        require(isValidSignature(sender, amount, signature, address(this)), "Invalid signature");
        require(amount <= deposit, "Amount exceeds deposit");

        receiver.transfer(amount);
        if (address(this).balance > 0) {
            sender.transfer(address(this).balance);
        }

        emit ChannelClosed(msg.sender, amount);
    }

    function extend(uint256 newExpiration) external whenNotPaused {
        require(msg.sender == sender, "Only sender can extend expiration");
        require(newExpiration > expiration, "New expiration must be later than current expiration");
        expiration = newExpiration;
        emit ChannelExtended(newExpiration);
    }

    function claimTimeout() external nonReentrant whenNotPaused {
        require(block.timestamp >= expiration, "Channel not yet expired");
        uint256 amount = address(this).balance;
        sender.transfer(amount);
        emit TimeoutClaimed(sender, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
