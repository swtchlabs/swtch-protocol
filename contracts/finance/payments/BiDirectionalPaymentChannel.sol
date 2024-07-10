// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "../../did/IdentityManager.sol";

/**
 * @title BiDirectionalPaymentChannel
 * @author astor@swtch.network
 * @notice BiDirectionalPaymentChannel is a simple bi-directional payment channel between two parties, as the name implies.
 */
contract BiDirectionalPaymentChannel is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    
    IdentityManager public identityManager;

    address public partyA;
    address public partyB;
    uint256 public duration;
    uint256 public expiration;

    mapping(address => uint256) public balances;

    event ChannelOpened(address indexed partyA, address indexed partyB, uint256 duration);
    event ChannelClosed(address indexed closer, uint256 amountA, uint256 amountB);
    event Deposited(address indexed party, uint256 amount);
    event ChannelExtended(uint256 newExpiration);
    event TimeoutClaimed(address indexed claimer, uint256 amount);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }
    
    /**
     * @dev Initializer
     * @param _partyB Party B address to associate with the payment channel.
     * @param _duration Duration of the payment channel before expiration.
     */
    function initialize(address _partyB, uint256 _duration, address _identityManager) public payable initializer {
        __Ownable_init(msg.sender); // This sets msg.sender as the owner
        __ReentrancyGuard_init();
        __Pausable_init();

        partyA = msg.sender;
        partyB = _partyB;
        duration = _duration;
        expiration = block.timestamp + duration;
        balances[partyA] = msg.value;
        identityManager = IdentityManager(_identityManager);

        emit ChannelOpened(partyA, partyB, duration);
    }

    function close(address did, uint256 amountA, uint256 amountB, bytes memory signatureA, bytes memory signatureB) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyDIDOwner(did) 
    {
        require(msg.sender == partyA || msg.sender == partyB, "Not a participant");
        require(isValidSignature(partyA, amountA, amountB, signatureA), "Invalid signature from party A");
        require(isValidSignature(partyB, amountA, amountB, signatureB), "Invalid signature from party B");

        require(amountA <= balances[partyA], "Insufficient balance for party A");
        require(amountB <= balances[partyB], "Insufficient balance for party B");

        payable(partyA).transfer(amountA);
        payable(partyB).transfer(amountB);

        uint256 remainingBalance = address(this).balance;
        if (remainingBalance > 0) {
            payable(owner()).transfer(remainingBalance);
        }

        emit ChannelClosed(msg.sender, amountA, amountB);
    }

    function deposit() external payable whenNotPaused {
        require(msg.sender == partyB, "Only party B can deposit");
        balances[partyB] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function extend(uint256 newExpiration) external whenNotPaused {
        require(msg.sender == partyA, "Only party A can extend expiration");
        require(newExpiration > expiration, "New expiration must be later than current expiration");
        expiration = newExpiration;
        emit ChannelExtended(newExpiration);
    }

    function claimTimeout() external nonReentrant whenNotPaused {
        require(msg.sender == partyA, "Only party A can claim timeout");
        require(block.timestamp >= expiration, "Channel not yet expired");
        uint256 amount = address(this).balance;
        payable(partyA).transfer(amount);
        emit TimeoutClaimed(partyA, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Utils
    
    function recoverSigner(bytes32 message, bytes memory sig) internal pure returns (address) {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(message, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function isValidSignature(address signer, uint256 amountA, uint256 amountB, bytes memory signature) internal view returns (bool) {
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, amountA, amountB)));
        return recoverSigner(message, signature) == signer;
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

}
