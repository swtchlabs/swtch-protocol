// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

contract LogicContract {
    uint256 public count;

    function increment() public {
        count += 1;
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}
