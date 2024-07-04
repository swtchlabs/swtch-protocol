// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./ERC725Y.sol";

/**
 * @title ERC725X
 * @author astor@swtch.network
 * @notice ERC-725X for executing arbitrary operations.
 */
contract ERC725X is ERC725Y {
    enum OperationType { CALL, DELEGATECALL, CREATE, CREATE2, STATICCALL }

    event Executed(uint256 indexed operation, address indexed to, uint256 value, bytes data);

    constructor(address _owner) ERC725Y(_owner) {}

    function execute(uint256 operation, address payable to, uint256 value, bytes calldata data) external onlyOwner {
        require(operation <= uint256(OperationType.STATICCALL), "Invalid operation");

        bool success;
        bytes memory result;

        if (operation == uint256(OperationType.CALL)) {
            (success, result) = to.call{value: value}(data);
        } else if (operation == uint256(OperationType.DELEGATECALL)) {
            (success, result) = to.delegatecall(data);
        } else if (operation == uint256(OperationType.CREATE)) {
            address newContract;
            bytes memory creationData = data;
            assembly {
                newContract := create(value, add(creationData, 0x20), mload(creationData))
            }
            success = newContract != address(0);
            if (!success) {
                revert("Create operation failed");
            }
            emit Executed(operation, newContract, value, data);
        } else if (operation == uint256(OperationType.CREATE2)) {
            address newContract;
            bytes memory creationData = data;
            bytes32 salt = keccak256(abi.encodePacked(to, creationData));
            assembly {
                newContract := create2(value, add(creationData, 0x20), mload(creationData), salt)
            }
            success = newContract != address(0);
        } else if (operation == uint256(OperationType.STATICCALL)) {
            (success, result) = to.staticcall(data);
        }

        // Log the result and revert reason if failed
        if (!success) {
            if (result.length > 0) {
                assembly {
                    let returndata_size := mload(result)
                    revert(add(32, result), returndata_size)
                }
            } else {
                revert("Execution failed");
            }
        }

        emit Executed(operation, to, value, data);
    }
}
