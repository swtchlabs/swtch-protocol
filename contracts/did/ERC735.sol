// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./IERC735.sol";

/**
 * @title ERC735
 * @author astor@swtch.network
 * @notice Provides a structured way to add, get, and remove claims, and it includes additional functionalities and events specific to claim management.
 */
contract ERC735 is IERC735 {
    address private owner;
    mapping(bytes32 => Claim) private claims;
    mapping(uint256 => bytes32[]) private claimsByType;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function getClaim(bytes32 claimId) external view override returns (uint256 claimType, address issuer, bytes memory signature, bytes memory data, string memory uri) {
        Claim storage claim = claims[claimId];
        return (claim.claimType, claim.issuer, claim.signature, claim.data, claim.uri);
    }

    function getClaimIdsByType(uint256 claimType) external view override returns (bytes32[] memory claimIds) {
        return claimsByType[claimType];
    }

    function addClaim(uint256 claimType, address issuer, bytes memory signature, bytes memory data, string memory uri) external override onlyOwner returns (bytes32 claimId) {
        claimId = keccak256(abi.encodePacked(claimType, issuer, data));
        claims[claimId] = Claim(claimType, issuer, signature, data, uri);
        claimsByType[claimType].push(claimId);

        emit ClaimAdded(claimId, claimType, issuer, signature, data, uri);
    }

    function removeClaim(bytes32 claimId) external override onlyOwner returns (bool success) {
        Claim storage claim = claims[claimId];
        bytes32[] storage claimIds = claimsByType[claim.claimType];

        // Find and remove the claimId from the claimsByType mapping
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
