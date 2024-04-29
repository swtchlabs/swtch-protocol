// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "../../access/RoleBasedAccessControl.sol";

/**
 * @title SubscriptionManager
 * @author astor@swtch.network 
 * @notice SubscriptionManager manages native cryptocurrency based subscription fees.
 */
contract SubscriptionManager is RoleBasedAccessControl {
    uint256 public subscriptionFee;
    uint256 public subscriptionDuration; // in seconds, e.g., 30 days

    struct Subscriber {
        uint256 startTime;
        uint256 endTime;
    }

    mapping(address => Subscriber) public subscribers;

    event Subscribed(address indexed user, uint256 startTime, uint256 endTime);
    event SubscriptionRenewed(address indexed user, uint256 newEndTime);
    event SubscriptionCancelled(address indexed user);

    constructor(uint256 _fee, uint256 _duration) 
      RoleBasedAccessControl() 
    {
        subscriptionFee = _fee;
        subscriptionDuration = _duration;
    }

    function subscribe() public payable {
        require(msg.value == subscriptionFee, "Incorrect fee");
        Subscriber storage user = subscribers[msg.sender];
        require(block.timestamp > user.endTime, "Current subscription must expire before renewal");

        if (user.endTime == 0) { // New subscriber
            user.startTime = block.timestamp;
            user.endTime = block.timestamp + subscriptionDuration;
        } else { // Renewing subscription
            user.endTime += subscriptionDuration; // Renew the subscription from the current time
        }

        emit Subscribed(msg.sender, user.startTime, user.endTime);
    }

    function checkSubscription(address user) public view returns (bool isActive) {
        return subscribers[user].endTime > block.timestamp;
    }

    function cancelSubscription() public {
        require(subscribers[msg.sender].endTime != 0, "No active subscription");
        subscribers[msg.sender].endTime = block.timestamp;
        emit SubscriptionCancelled(msg.sender);
    }

    function adjustSubscriptionFee(uint256 newFee) public onlyOwner {
        subscriptionFee = newFee;
    }

    function adjustSubscriptionDuration(uint256 newDuration) public onlyOwner {
        subscriptionDuration = newDuration;
    }

    // Optionally add a withdraw function to handle contract balances
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
