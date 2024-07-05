// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

contract UUPSLogic {
    uint256 public count;
    address private admin;

    constructor() {
        initialize(msg.sender);
    }

    function initialize(address initialAdmin) public {
        require(admin == address(0), "Already initialized"); // Ensure this is only set once
        admin = initialAdmin;
    }

    function increment() public {
        count += 1;
    }
}