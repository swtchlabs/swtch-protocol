// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "../../access/RoleBasedAccessControl.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title ERC20SubscriptionManager
 * @author astor@swtch.network
 * @notice ERC20SubscriptionManager manages ERC20 token based subscription fees.
 */
contract ERC20SubscriptionManager is RoleBasedAccessControl {
    IERC20 public token;
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

    /**
     * @dev Constructor
     * @param _tokenAddress Address of the token.
     * @param _fee Service fee.
     * @param _duration Subscription length.
     */
    constructor(address _tokenAddress, uint256 _fee, uint256 _duration) {
        token = IERC20(_tokenAddress);
        subscriptionFee = _fee;
        subscriptionDuration = _duration;
    }

    function subscribe() public {
        require(token.transferFrom(msg.sender, address(this), subscriptionFee), "Fee transfer failed");
        Subscriber storage user = subscribers[msg.sender];
        require(block.timestamp > user.endTime, "Current subscription must expire before renewal");

        if (user.endTime == 0) {  // New subscriber
            user.startTime = block.timestamp;
            user.endTime = block.timestamp + subscriptionDuration;
        } else {
            if (block.timestamp > user.endTime) {
                user.startTime = block.timestamp; // Reset start time if subscription has expired
            }
            user.endTime = max(block.timestamp, user.endTime) + subscriptionDuration; // Extend from now or the end time, whichever is later
        }
        emit Subscribed(msg.sender, user.startTime, user.endTime);
    }

    function checkSubscription(address user) public view returns (bool isActive) {
        return subscribers[user].endTime > block.timestamp;
    }

    function cancelSubscription() public {
        require(subscribers[msg.sender].endTime != 0, "No active subscription");
        subscribers[msg.sender].endTime = block.timestamp;  // or set to 0 if you prefer to clear data
        emit SubscriptionCancelled(msg.sender);
    }

    function adjustSubscriptionFee(uint256 newFee) public onlyOwner {
        subscriptionFee = newFee;
    }

    function adjustSubscriptionDuration(uint256 newDuration) public onlyOwner {
        subscriptionDuration = newDuration;
    }

    function withdrawTokens(address to, uint256 amount) public onlyOwner {
        uint256 contractBalance = token.balanceOf(address(this));
        require(amount <= contractBalance, "Withdrawal amount exceeds balance");
        require(token.transfer(to, amount), "Withdrawal transfer failed");
    }

    // utility, move to utils
    function max(uint a, uint b) private pure returns (uint) {
        return a > b ? a : b;
    }
}
