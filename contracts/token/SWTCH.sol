// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title SWTCH
 * @author astor@swtch.network
 * @notice SWTCH Network Token upgradeable ERC-20 implementation.
 */
contract SWTCH is Initializable, ERC20Upgradeable, OwnableUpgradeable {

    /**
     * @param owner Owner who received minted SWTCH.
     * @param value Amount of SWTCH allocated to the Owner.
     */
    event AdminMint(address indexed owner, uint256 value);

    /**
     * @param initialSupply Initial token supply.
     * @param admin SWTCH Network Token administrator.
     */
    function initialize(
        uint256 initialSupply,
        address admin
    ) public initializer {
        __ERC20_init("SWTCH Network Token", "SWTCH");
        __Ownable_init(admin);
        
        _mint(admin, initialSupply);
        // transferOwnership(admin);
    }

    /**
     * @param newSupply New token supply to allocate to the owner.
     */
    function adminMint(uint256 newSupply) external onlyOwner {
        _mint(owner(), newSupply);

        emit AdminMint(owner(), newSupply);
    }
}