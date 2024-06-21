// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SecretsSpace
 * @author astor@swtch.network
 * @notice A SecretsSpace is managed by SecretsManager, as a SecretsManager may manage n number of SecretsSpaces.
 * This contract allows for decentralized storage of encrypted key-value pairs, with access control and delegation capabilities.
 */
contract SecretsSpace is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    address public immutable owner;
    uint256 private _fee;

    mapping(bytes => bytes) private secretValues;
    mapping(address => mapping(bytes => bool)) public delegatePermissions;

    event SecretAdded(bytes indexed identifier);
    event FeesAdjusted(uint256 oldSecretFee, uint256 newSecretFee);
    event SecretAccessed(address accessedBy, bytes identifier);
    event DelegateAuthorized(address delegate, bytes identifier);
    event DelegateRevoked(address delegate, bytes identifier);

    constructor(uint256 fee_) {
        owner = msg.sender;
        _fee = fee_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Requires ADMIN_ROLE");
        _;
    }

    modifier onlyAuthorized(bytes memory identifier) {
        require(msg.sender == owner || delegatePermissions[msg.sender][identifier], "Not authorized");
        _;
    }
    
    function getFee() public view returns(uint256) {
      return _fee;
    }

    // Adjust the fee for adding secrets, restricted to admins
    function adjustFees(uint256 newFee) public onlyAdmin {
        uint256 oldFee = _fee;
        _fee = newFee;
        emit FeesAdjusted(oldFee, newFee);
    }

    // Add a new secret to the space, requiring a minimum fee
    function addSecret(bytes memory identifier, bytes memory secretValue) external payable {
        require(msg.value >= _fee, "Fee is not sufficient");
        require(identifier.length > 0, "Identifier cannot be empty");
        require(secretValue.length > 0, "Secret Value cannot be empty");
        require(secretValues[identifier].length == 0, "Identifier already exists");

        secretValues[identifier] = secretValue;
        emit SecretAdded(identifier);

        if (msg.value > _fee) {
            payable(msg.sender).transfer(msg.value - _fee);
        }
    }

    function feesCollected() public view returns(uint256) {
        return address(this).balance;
    }

    // Allow admins to withdraw fees collected from the contract
    function withdrawFees(address payable recipient, uint256 amount) public onlyAdmin {
        require(amount <= address(this).balance, "Insufficient funds");
        recipient.transfer(amount);
    }

    // Retrieve a secret by its identifier, with access control
    function getSecret(bytes memory identifier) public onlyAuthorized(identifier) returns (bytes memory) {
        emit SecretAccessed(msg.sender, identifier);
        return secretValues[identifier];
    }

    // Authorize a delegate to access a specific secret
    function authorizeDelegate(address delegate, bytes memory identifier) public onlyAuthorized(identifier) {
        delegatePermissions[delegate][identifier] = true;
        emit DelegateAuthorized(delegate, identifier);
    }

    // Revoke a delegate's access to a specific secret
    function revokeDelegate(address delegate, bytes memory identifier) public onlyAuthorized(identifier) {
        delete delegatePermissions[delegate][identifier];
        emit DelegateRevoked(delegate, identifier);
    }

    // Delete a secret, ensuring only authorized users can perform this action
    function deleteSecret(bytes memory identifier) public onlyAuthorized(identifier) {
        require(secretValues[identifier].length != 0, "Identifier does not exist");
        delete secretValues[identifier];
    }
}
