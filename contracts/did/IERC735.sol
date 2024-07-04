// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC735 {
    event ClaimRequested(uint256 indexed claimRequestId, uint256 indexed claimType, address indexed issuer, bytes data, string uri);
    event ClaimAdded(bytes32 indexed claimId, uint256 indexed claimType, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimRemoved(bytes32 indexed claimId, uint256 indexed claimType, address indexed issuer, bytes signature, bytes data, string uri);

    struct Claim {
        uint256 claimType;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    function getClaim(bytes32 claimId) external view returns (uint256 claimType, address issuer, bytes memory signature, bytes memory data, string memory uri);
    function getClaimIdsByType(uint256 claimType) external view returns (bytes32[] memory claimIds);
    function addClaim(uint256 claimType, address issuer, bytes memory signature, bytes memory data, string memory uri) external returns (bytes32 claimId);
    function removeClaim(bytes32 claimId) external returns (bool success);
}