// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./IERC725.sol";

/**
 * @title ERC725
 * @author astor@swtch.network
 * @notice Manages the unique identities and associated data. 
 */
contract ERC725 is IERC725 {
    address private owner;
    mapping(bytes32 => bytes) private data;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        emit OwnerChanged(owner);
    }

    function getData(bytes32 key) external view override returns (bytes memory) {
        return data[key];
    }

    function setData(bytes32 key, bytes memory value) external override onlyOwner {
        data[key] = value;
        emit DataChanged(key, value);
    }

    function getOwner() external view override returns (address) {
        return owner;
    }

    function changeOwner(address newOwner) external override onlyOwner {
        owner = newOwner;
        emit OwnerChanged(owner);
    }
}
