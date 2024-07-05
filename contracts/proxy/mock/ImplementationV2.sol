// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./ImplementationV1.sol";

contract ImplementationV2 is ImplementationV1 {
    uint256 public additionalStateVariable;

    function newFunction() public view returns (uint256) {
        return additionalStateVariable;
    }

    function incrementStateVariable() public {
        additionalStateVariable++;
    }
}

// contract ImplementationV2 {
//     address private admin;
//     address private pendingImplementation;

//     constructor() {
//         admin = msg.sender;  // The deployer is initially the admin.
//     }

//     modifier onlyAdmin() {
//         require(msg.sender == admin, "Unauthorized");
//         _;
//     }

//     function proposeUpgrade(address newImplementation) public onlyAdmin {
//         pendingImplementation = newImplementation;
//     }

//     function approveUpgrade() public onlyAdmin {
//         require(pendingImplementation != address(0), "No pending upgrade");
//         (bool success, ) = address(this).call(abi.encodeWithSignature("upgradeTo(address)", pendingImplementation));
//         require(success, "Upgrade failed");
//         pendingImplementation = address(0);
//     }

//     // Functions from ImplementationV1
//     uint256 public value;

//     function store(uint256 newValue) public {
//         value = newValue;
//     }

//     function retrieve() public view returns (uint256) {
//         return value;
//     }

//     // New function added in ImplementationV2
//     function increment() public {
//         value += 1;  // Increment the stored value by 1
//     }
// }
