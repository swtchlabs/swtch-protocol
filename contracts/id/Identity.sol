// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ERC725X.sol";
import "./ERC725Y.sol";

/**
 * @title Identity
 * @author astor@swtch.network
 * @notice Combined identity provision using ERC-725X and ERC-725Y. Allows a single contract to manage identities and their claims.
 */
contract ERC725Identity is ERC725X {
    constructor(address _owner) ERC725X(_owner) {}
}
