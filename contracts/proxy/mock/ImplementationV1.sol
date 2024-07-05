// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title ImplementationV1
 * @dev Initial version of an upgradeable contract.
 */
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ImplementationV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Authorization logic for upgrading the contract
    }
}
// contract ImplementationV1 {
//     address public admin;
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

//     function upgradeTo(address newImplementation) public onlyAdmin {
//         // This encodes the ABI of the `upgradeTo` method to be called through this contract itself
//         (bool success, ) = address(this).delegatecall(
//             abi.encodeWithSignature("upgradeTo(address)", newImplementation)
//         );
//         require(success, "Upgrade failed");
//     }

//     // Example function that uses storage
//     uint256 public value;

//     function store(uint256 newValue) public {
//         value = newValue;
//     }

//     function retrieve() public view returns (uint256) {
//         return value;
//     }
// }
