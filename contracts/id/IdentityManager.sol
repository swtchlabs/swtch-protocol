// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./ERC725.sol";
import "./ERC735.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title IdentityManager
 * @author astor@swtch.network
 * @notice Decentralized Identifier (DID) Manager that can issue, manage, and verify decentralized identities. The DID concept is a core component of decentralized identity frameworks, where a DID uniquely represents an entity (e.g., person, organization, device) and is controlled by the entity itself rather than a central authority. 
 */
contract IdentityManager is Initializable, OwnableUpgradeable {
    struct Identity {
        address owner;
        mapping(address => bool) delegates; // Stores delegates
        address claimsContract; // ERC735 associated contract
        string didDocument; // DID document reference
    }

    mapping(address => Identity) public identities;

    event IdentityUpdated(address indexed did);
    event DelegateUpdated(address indexed did, address delegate, bool enabled);

    modifier onlyOwnerOrDelegate(address did) {
        require(msg.sender == identities[did].owner || identities[did].delegates[msg.sender], "Unauthorized");
        _;
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    function registerIdentity(address did, address owner, string memory documentHash) public onlyOwner {
        require(identities[did].owner == address(0), "Identity already exists");
        Identity storage identity = identities[did];
        identity.owner = owner;
        identity.didDocument = documentHash;
        identity.claimsContract = address(new ERC735(owner));
        emit IdentityUpdated(did);
    }

    function setDIDDocument(address did, string memory documentHash) public onlyOwnerOrDelegate(did) {
        identities[did].didDocument = documentHash;
        emit IdentityUpdated(did);
    }

    function addDelegate(address did, address delegate) public onlyOwnerOrDelegate(did) {
        identities[did].delegates[delegate] = true;
        emit DelegateUpdated(did, delegate, true);
    }

    function removeDelegate(address did, address delegate) public onlyOwnerOrDelegate(did) {
        delete identities[did].delegates[delegate];
        emit DelegateUpdated(did, delegate, false);
    }

    // Verify if an address is the owner or a delegate of a DID
    function isOwnerOrDelegate(address did, address user) public view returns (bool) {
        Identity storage identity = identities[did];
        return user == identity.owner || identity.delegates[user];
    }

}