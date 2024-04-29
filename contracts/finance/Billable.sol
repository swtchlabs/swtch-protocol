// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "../access/RoleBasedAccessControl.sol";

/**
 * @title Billable 
 * @author astor@swtch.network
 * @notice SWTCH Protocol Smart Contracts Billable implementation for service fee management.
 */
contract Billable is RoleBasedAccessControl {

    /**
     * @dev Billable fee for a service.
     */
    uint256 private _fee;

    /**
     * @dev Fee adjusted event.
     * @param adjuster Account adjusting the fee.
     * @param oldFee Previous billable fee.
     * @param newFee New billable fee.
     * @param timestamp Timestamp of the fee adjustement.
     */
    event FeesAdjusted(address indexed adjuster, uint256 oldFee, uint256 newFee, uint256 timestamp);

    /**
     * @dev Constructor
     * @param serviceFee Billable fee setting. 
     */
    constructor(uint256 serviceFee) 
      RoleBasedAccessControl() 
    {
      _fee = serviceFee;
    }

    /**
     * @dev Return the current service fee.
     */
    function getFee() public view returns(uint256) {
      return _fee;
    }

    /**
     * @dev Allow service fee adjustment.
     * @param _adjustedFee Adjust the billable fee.
     */
    function adjustFees(uint256 _adjustedFee) public onlyOwner {
      require(_adjustedFee > 0, "Fee must be greater than zero");
      // adjust fee 
      uint256 oldFee = _fee;
      _fee = _adjustedFee;
      // emit event
      emit FeesAdjusted(msg.sender, oldFee, _adjustedFee, block.timestamp);
    }

    /**
     * @dev Collect the service fees.
     */
    function collectFee() public payable {
      require(msg.value == _fee, "Fee not met");
      // Handle collected fees, e.g., store, redistribute, etc.
    }

    function withdraw(address payable recipient) public onlyOwner {
      uint256 balance = address(this).balance;
      recipient.transfer(balance);
    }

}
