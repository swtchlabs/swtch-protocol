// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title MockBusinessLogic
 * @author astor@swtch.network
 * @notice MockBusinessLogic is a mock for testing the UUPS Proxy.
 */
contract MockBusinessLogic {
    address public implementationAddress;
    uint256 public count;

    function increment() public {
        count += 1;
    }

    function upgradeTo(address newImplementation) public {
        require(msg.sender == implementationAddress, "Unauthorized");
        implementationAddress = newImplementation;
    }

    function initialize(address impl) public {
        implementationAddress = impl;
    }
}
