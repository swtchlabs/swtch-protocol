// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "./SecretsSpace.sol";

/**
 * @title SecretsManager 
 * @author astor@swtch.network
 * @notice SecretsManager is a system of storing encrypted information, keys, secrets, passwords. SecretsManager is only responsible for storage management not the actual encryption. All encryption will be handled by the SWTCH SDK.
 */
contract SecretsManager {
    
    address immutable public owner;
    uint256 private _fee;

    struct Space {
        address owner;
        address deployed;
        bool enabled;
    }

    mapping(address => Space) public spaces; // Tracks the deployment and status of spaces by user
    mapping(address => address[]) public subspaces; // Optional: Track subspaces for each user

    event SpaceAdded(address indexed owner, address indexed deployed);
    event SubSpaceAdded(address indexed owner, address indexed subOwner, address indexed deployed);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner may perform this action");
        _;
    }

    /**
     * @dev Constructor
     * @param fee_ Cost associated with storage of each individual secret key,value pair.
     */
    constructor(uint256 fee_) {
        owner = msg.sender;
        _fee = fee_;
    }

    function getFee() external view returns (uint256) {
        return _fee;
    }
 
    function getSubSpaces(address user) public view returns (address[] memory) {
      return subspaces[user];
    }
    
    
    function addSpace(address user) external onlyOwner {
        require(spaces[user].deployed == address(0), "Space already exists for this user");

        SecretsSpace newSpace = new SecretsSpace(_fee); // Assuming no parameters in constructor
        address deployedAddress = address(newSpace);

        spaces[user] = Space({
            owner: user,
            deployed: deployedAddress,
            enabled: true
        });

        emit SpaceAdded(user, deployedAddress);
    }

    function addSubSpace(address user, address subUser) external onlyOwner {
        require(spaces[user].enabled, "Parent space is not enabled.");
        require(spaces[subUser].deployed == address(0), "Subspace already exists for this sub-user");

        SecretsSpace newSubSpace = new SecretsSpace(_fee); 
        address deployedSubSpace = address(newSubSpace);

        spaces[subUser] = Space({
            owner: subUser,
            deployed: deployedSubSpace,
            enabled: true
        });

        subspaces[user].push(deployedSubSpace);

        emit SubSpaceAdded(user, subUser, deployedSubSpace);
    }

    function disableSpace(address user) external onlyOwner {
        require(spaces[user].deployed != address(0), "No space deployed for this user.");
        spaces[user].enabled = false;
        // TODO Consider what to do with subspaces if any, are they also disabled.
        // Possibly add a flag to disable sub spaces
    }
}
