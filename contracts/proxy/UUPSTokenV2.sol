// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "./UUPSToken.sol";

/**
 * @title UUPSTokenV2
 * @dev New version of the UUPSToken contract used for testing the Upgrade functionality, an ERC20 token using UUPS upgradability features with dependency on a Governance implemenation to complete the upgrade process.
 * @author astor@swtch.network
 */
contract UUPSTokenV2 is UUPSToken {
    
    /**
     * @notice New contract functionality upgrade.
     */
    function newFunction() public pure returns (string memory) {
        return "New functionality!";
    }
}