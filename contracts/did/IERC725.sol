// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

interface IERC725 {
    event DataChanged(bytes32 indexed key, bytes value);
    event OwnerChanged(address indexed owner);

    function getData(bytes32 key) external view returns (bytes memory);
    function setData(bytes32 key, bytes memory value) external;
    function getOwner() external view returns (address);
    function changeOwner(address newOwner) external;
}