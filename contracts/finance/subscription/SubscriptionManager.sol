// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "../../did/IdentityManager.sol";
import "../../access/RoleBasedAccessControl.sol";

/**
 * @title SubscriptionManager
 * @author astor@swtch.network 
 * @notice SubscriptionManager manages native cryptocurrency based subscription fees.
 */
contract SubscriptionManager is RoleBasedAccessControl {

    IdentityManager public identityManager;

    uint256 public subscriptionFee;
    uint256 public subscriptionDuration; // in seconds, e.g., 30 days

    struct Subscriber {
        uint256 startTime;
        uint256 endTime;
        uint256 planId;
        bool active;
    }

    mapping(address => Subscriber) public subscribers;
    mapping(uint256 => uint256) public plans; // Plan ID to pricing or other details


    event Subscribed(address indexed user, uint256 startTime, uint256 endTime, uint256 planId);
    event SubscriptionRenewed(address indexed user, uint256 newEndTime, uint256 planId);
    event SubscriptionCancelled(address indexed user);
    event PlanAdded(uint256 planId, uint256 price);
    event PlanUpdated(uint256 planId, uint256 newPrice);

    modifier onlyDIDOwner(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Unauthorized: caller is not the owner or delegate");
        _;
    }

    constructor(uint256 _fee, uint256 _duration, address _identityManager) 
      RoleBasedAccessControl() 
    {
        subscriptionFee = _fee;
        subscriptionDuration = _duration;

        identityManager = IdentityManager(_identityManager);
    }
    
    function addPlan(uint256 planId, uint256 price) external onlyOwner {
        plans[planId] = price;
        emit PlanAdded(planId, price);
    }

    function updatePlan(uint256 planId, uint256 newPrice) external onlyOwner {
        plans[planId] = newPrice;
        emit PlanUpdated(planId, newPrice);
    }

    function subscribe(address userDID, uint256 planId) public payable onlyDIDOwner(userDID) {
        require(plans[planId] > 0, "Invalid plan");
        require(msg.value == plans[planId], "Incorrect fee");
        Subscriber storage user = subscribers[userDID];
        require(block.timestamp > user.endTime, "Current subscription must expire before renewal");

        user.endTime = block.timestamp + subscriptionDuration; // Handles both new and renewing subscriptions
        user.planId = planId;
        user.active = true;
        
        emit Subscribed(userDID, user.startTime, user.endTime, planId);
    }

    function checkSubscription(address user) public view returns (bool isActive) {
        return subscribers[user].endTime > block.timestamp;
    }

    function cancelSubscription() public onlyDIDOwner(msg.sender) {
        require(subscribers[msg.sender].active, "No active subscription");
        subscribers[msg.sender].active = false;
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
