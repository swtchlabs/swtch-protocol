// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title SecretsSpace
 * @author astor@swtch.network
 * @notice A SecretsSpace is managed by SecretsManager, as a SecretsManager may manage n number of SecretsSpaces.
 */
contract SecretsSpace {
    
    /**
     * @dev Owner of the smart contract.
     * TODO use RBA smart contract to manage ownership.
     */
    address immutable public owner;

    /**
     * @dev Mapping of (key, value) pairs
     */
    mapping(bytes => bytes) private secretValues;
    event SecretAdded(bytes indexed identifier);
    event FeesAdjusted(uint256 oldSecretFee, uint256 newSecretFee);
    
    // Specify the fee for adding a secret
    uint256 private _fee;

    /**
     * @dev Modifier to restrict functions to the owner.
     */
    modifier onlyOwner() {
      require(msg.sender == owner, "Only owner may perform this action");
      _;
    }

    // fee_ parameter to set the fee for adding a secret.
    // This fee can be specified in wei, and the addSecret function checks if the sent value (msg.value) is at least this amount.
    constructor(uint256 fee_) {
      // owner
      owner = msg.sender;
      // fee 
      _fee = fee_;
    }

    function getFee() public view returns(uint256) {
      return _fee;
    }

    // Function to add a new identifier-secretValue pair
    // addSecret function is declared with the payable modifier, allowing it to receive Ether along with the call.
    function addSecret(bytes memory identifier, bytes memory secretValue) external payable {
      require(msg.value >= _fee, "Fee is not sufficient");
      require(identifier.length > 0, "Identifier cannot be empty");
      require(secretValue.length > 0, "Secret Value cannot be empty");
      require(secretValues[identifier].length == 0, "Identifier already exists");

      secretValues[identifier] = secretValue;
      emit SecretAdded(identifier);
        
      // Optional: Refund any excess payment
      // If the user sends more Ether than the required fee, the contract refunds the excess amount. 
      // This is optional but can improve the user experience.
      if(msg.value > _fee) {
        payable(msg.sender).transfer(msg.value - _fee);
      }
    }

    // Allow fee adjustment for secret storage
    function adjustFees(uint256 _addSecretFee) public onlyOwner {
      // adjust fee 
      uint256 oldFee = _fee;
      _fee = _addSecretFee;
      emit FeesAdjusted(oldFee, _addSecretFee);
    }

    // Allow the contract owner to withdraw fees collected
    // withdrawFees function allows the contract owner (or another authorized entity) to withdraw the collected fees. 
    // Implement proper access control measures to ensure only authorized users can withdraw.
    function withdrawFees() public onlyOwner {
      // Implement access control to restrict this function to the contract owner
      payable(msg.sender).transfer(address(this).balance);
    }

    // Function to retrieve a secretValue by identifier
    function getSecret(bytes memory identifier) public view returns (bytes memory) {
      require(secretValues[identifier].length != 0, "Identifier does not exist");
      return secretValues[identifier];
    }

    // Optional: Function to delete a secret
    function deleteSecret(bytes memory identifier) public {
      require(secretValues[identifier].length != 0, "Identifier does not exist");
      delete secretValues[identifier];
    }
}
