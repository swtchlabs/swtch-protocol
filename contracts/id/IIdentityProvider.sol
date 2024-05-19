// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityProvider {
    function isValidIdentity(address user) external view returns (bool);
    function getIdentityDetails(address user) external view returns (bytes memory);
}