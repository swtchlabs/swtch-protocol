// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./ERC725.sol";

contract ERC725Y is ERC725 {
    struct Claim {
        uint256 claimType;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    mapping(bytes32 => Claim) private claims;
    mapping(uint256 => bytes32[]) private claimsByType;

    event ClaimAdded(bytes32 indexed claimId, uint256 indexed claimType, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimRemoved(bytes32 indexed claimId, uint256 indexed claimType, address indexed issuer, bytes signature, bytes data, string uri);

    constructor(address _owner) ERC725(_owner) {}

    function getClaim(bytes32 claimId) external view returns (uint256 claimType, address issuer, bytes memory signature, bytes memory data, string memory uri) {
        Claim storage claim = claims[claimId];
        return (claim.claimType, claim.issuer, claim.signature, claim.data, claim.uri);
    }

    function getClaimIdsByType(uint256 claimType) external view returns (bytes32[] memory claimIds) {
        return claimsByType[claimType];
    }

    function addClaim(uint256 claimType, address issuer, bytes memory signature, bytes memory data, string memory uri) external onlyOwner returns (bytes32 claimId) {
        claimId = keccak256(abi.encodePacked(claimType, issuer, data));
        claims[claimId] = Claim(claimType, issuer, signature, data, uri);
        claimsByType[claimType].push(claimId);

        emit ClaimAdded(claimId, claimType, issuer, signature, data, uri);
    }

    function removeClaim(bytes32 claimId) external onlyOwner returns (bool success) {
        Claim storage claim = claims[claimId];
        bytes32[] storage claimIds = claimsByType[claim.claimType];

        for (uint256 i = 0; i < claimIds.length; i++) {
            if (claimIds[i] == claimId) {
                claimIds[i] = claimIds[claimIds.length - 1];
                claimIds.pop();
                break;
            }
        }

        delete claims[claimId];

        emit ClaimRemoved(claimId, claim.claimType, claim.issuer, claim.signature, claim.data, claim.uri);
        success = true;
    }
}
