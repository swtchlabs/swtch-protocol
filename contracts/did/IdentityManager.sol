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

    struct Attestation {
        string issuer;
        string claim;
        uint256 issuedAt;
    }

    mapping(address => Identity) public identities;
    mapping(address => Attestation[]) private attestations;

    event IdentityUpdated(address indexed did);
    event DelegateUpdated(address indexed did, address delegate, bool enabled);
    event AttestationAdded(address indexed did, string issuer, string claim, uint256 issuedAt);

    modifier onlyOwnerOrDelegate(address did) {
        require(msg.sender == identities[did].owner || identities[did].delegates[msg.sender], "Unauthorized");
        _;
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    // Any user may register an identity
    function registerIdentity(address did, address owner, string memory documentHash) public {
        require(identities[did].owner == address(0), "Identity already exists");
        Identity storage identity = identities[did];
        identity.owner = owner;
        identity.didDocument = documentHash;
        identity.claimsContract = address(new ERC735(owner));
        emit IdentityUpdated(did);
    }

    // Set DID document for an identity
    function setDIDDocument(address did, string memory documentHash) public onlyOwnerOrDelegate(did) {
        identities[did].didDocument = documentHash;
        emit IdentityUpdated(did);
    }

    /**
     * Add a delegate to manage an Identity account.
     * @param did Registered user DID account.
     * @param delegate Delegate DID account. If the Identity for delegate does not exist it will be rejected. Delegates must have registered DID.
     */
    function addDelegate(address did, address delegate) public onlyOwnerOrDelegate(did) {
        require(identities[delegate].owner != address(0), "Delegate identity does not exist");
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

    // Add attestation ensuring the DID is already registered
    function addAttestation(address did, string memory issuer, string memory claim) public {
        require(identities[did].owner != address(0), "Identity does not exist");

        Attestation memory attestation = Attestation({
            issuer: issuer,
            claim: claim,
            issuedAt: block.timestamp
        });

        attestations[did].push(attestation);

        emit AttestationAdded(did, issuer, claim, block.timestamp);
    }

    function getAttestations(address did) public view returns (Attestation[] memory) {
        return attestations[did];
    }

    function verifyAttestation(address did, string memory issuer, string memory claim) public view returns (bool) {
        Attestation[] memory attests = attestations[did];

        for (uint256 i = 0; i < attests.length; i++) {
            if (
                keccak256(abi.encodePacked(attests[i].issuer)) == keccak256(abi.encodePacked(issuer)) &&
                keccak256(abi.encodePacked(attests[i].claim)) == keccak256(abi.encodePacked(claim))
            ) {
                return true;
            }
        }

        return false;
    }
}
