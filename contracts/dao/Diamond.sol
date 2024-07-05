// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "../access/Owned.sol";
import "./Members.sol";
import "./Voting.sol";

contract Diamond is Owned, Members, Voting {
    constructor() {}
    
    function _setupMembersAndVoting() internal {
      //...
    //    Members._setupMembers(msg.sender);
    //    Voting._setupVoting(msg.sender);
    }

    function _transferOwnership(address newOwner) public {
    //   ... 
    //    self._acceptOwnership(msg.sender);
    //    Owned._transferOwnership(msg.sender, newOwner);
    }

    function _addMember(address member) public {
    //   Members._addMember(member);
    }

    function _removeMember(address member) public {
    //   Members._removeMember(member);
    }

    function _vote(address votedFor) public {
    //   Members._checkIsMember(msg.sender);
    //   Voting._vote(msg.sender, votedFor);
    }

    function _reclaimMember(address member) public {
    //   Members._reclaimMember(member);
    }
}