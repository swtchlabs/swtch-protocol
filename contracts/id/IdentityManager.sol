// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./ERC725.sol";
import "./ERC735.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


/**
 * @title Astor Rivera
 * @author astor@swtch.network
 * @notice Decentralized Identifier (DID) Manager that can issue, manage, and verify decentralized identities. The DID concept is a core component of decentralized identity frameworks, where a DID uniquely represents an entity (e.g., person, organization, device) and is controlled by the entity itself rather than a central authority. 
 */
contract IdentityManager is Initializable, OwnableUpgradeable {

    // Maps an address to its ERC725 and ERC735 contracts
    mapping(address => address) public identities;
    mapping(address => address) public claimsContracts;
    
    event IdentityCreated(address indexed owner, address identityContract, address claimsContract);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    function createIdentity(address owner) public onlyOwner returns (address identityContract, address claimsContract) {
        require(identities[owner] == address(0), "Identity already exists");

        ERC725 newIdentity = new ERC725(owner);
        ERC735 newClaims = new ERC735(address(newIdentity));

        identities[owner] = address(newIdentity);
        claimsContracts[owner] = address(newClaims);

        emit IdentityCreated(owner, address(newIdentity), address(newClaims));

        return (address(newIdentity), address(newClaims));
    }

    function getIdentity(address owner) public view returns (address identityContract, address claimsContract) {
        require(identities[owner] != address(0), "Identity does not exist");
        return (identities[owner], claimsContracts[owner]);
    }

}
