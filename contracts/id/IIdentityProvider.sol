// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title IIdentityProvider
 * @author astor@swtch.network
 * @notice Identity interface for all IdentityProvider implementations. 
 */
interface IIdentityProvider {
    function isValidIdentity(address user) external view returns (bool);
    function getIdentityDetails(address user) external view returns (bytes memory);
}