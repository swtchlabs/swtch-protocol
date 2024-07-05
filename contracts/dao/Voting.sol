// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

contract Voting {
    address[] public votedMembers;
    mapping(address => uint) public votes;

    function vote(address member) public {
        // require(isMember(member), "Only members can vote.");
        votes[member] += 1;
        votedMembers.push(member);
    }

    function getVoteCount(address member) public view returns (uint) {
        return votes[member];
    }

    function getVotePercentage(address member) public view returns (uint) {
        uint totalVotes = 0;
        for (uint i = 0; i < votedMembers.length; i++) {
            if (votes[votedMembers[i]] > 0) {
                totalVotes += votes[votedMembers[i]];
            }
        }
        if (totalVotes == 0) {
            return 0;
        }
        return (votes[member] * 1000 / totalVotes) * 10;
    }
}