// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "../id/IdentityManager.sol";
import "./SecretsSpace.sol";

/**
 * @title SecretsManager 
 * @author astor@swtch.network
 * @notice SecretsManager is a system of storing encrypted information, keys, secrets, passwords. SecretsManager is only responsible for storage management not the actual encryption. All encryption will be handled by the SWTCH SDK.
 */
contract SecretsManager {
    
    address immutable public owner;
    uint256 private _fee;
    IdentityManager private didRegistry; // Reference to the DID registry

    struct Space {
        address owner;
        address deployed;
        bool enabled;
    }

    mapping(address => Space) public spaces; // Tracks the deployment and status of spaces by user
    mapping(address => address[]) public subspaces; // Optional: Track subspaces for each user

    event SpaceAdded(address indexed owner, address indexed deployed);
    event SubSpaceAdded(address indexed owner, address indexed subOwner, address indexed deployed);

    modifier onlyDIDOwner(address did) {
        require(didRegistry.isOwnerOrDelegate(did, msg.sender), "Only DID owner can perform this action");
        _;
    }

    /**
     * @dev Constructor
     * @param fee_ Cost associated with storage of each individual secret key,value pair.
     * @param didRegistryAddress_ IdentityManager reference.
     */
    constructor(uint256 fee_, address didRegistryAddress_) {
        owner = msg.sender;
        _fee = fee_;
        didRegistry = IdentityManager(didRegistryAddress_); // Initialize with DID Registry address
    }

    function getFee() external view returns (uint256) {
        return _fee;
    }

    function getSpace(address userDID) public view returns (address) {
        return spaces[userDID].deployed;
    }
 
    function getSubSpaces(address userDID) public view returns (address[] memory) {
      return subspaces[userDID];
    }

    function addSpace(address userDID) external onlyDIDOwner(userDID) {
        require(spaces[userDID].deployed == address(0), "Space already exists for this user");
        SecretsSpace newSpace = new SecretsSpace(_fee);
        address deployedAddress = address(newSpace);
        spaces[userDID] = Space({
            owner: userDID,
            deployed: deployedAddress,
            enabled: true
        });
        emit SpaceAdded(userDID, deployedAddress);
    }

    function addSubSpace(address userDID, address subUserDID) external onlyDIDOwner(userDID) {
        require(spaces[userDID].enabled, "Parent space is not enabled.");
        require(spaces[subUserDID].deployed == address(0), "Subspace already exists for this sub-user");

        SecretsSpace newSubSpace = new SecretsSpace(_fee); 
        address deployedSubSpace = address(newSubSpace);

        spaces[subUserDID] = Space({
            owner: subUserDID,
            deployed: deployedSubSpace,
            enabled: true
        });

        subspaces[userDID].push(deployedSubSpace);

        emit SubSpaceAdded(userDID, subUserDID, deployedSubSpace);
    }

    function disableSpace(address userDID) external onlyDIDOwner(userDID) {
        require(spaces[userDID].deployed != address(0), "No space deployed for this user.");
        spaces[userDID].enabled = false;
        // TODO Consider what to do with subspaces if any, are they also disabled.
        // Possibly add a flag to disable sub spaces
    }
}
