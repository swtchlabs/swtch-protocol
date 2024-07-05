// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

contract Members {
    mapping (address => uint) public members;

    function applyForMembership() public payable {
        require(msg.value > 0, "Membership application requires a fee.");
        // members.push(msg.sender);
        members[msg.sender] = 1;
    }

    function leave() public {
        members[msg.sender] = 0;
    }

    // fix member testing
    function isMember(address member) public view returns (bool) {
        // return members.contains(member);
        return members[member] != 0;
    }
}