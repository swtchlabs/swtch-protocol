// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IGovernance {
    function isProposalApproved(uint256 proposalId) external view returns (bool);
}

/**
 * @title UUPSToken
 * @dev Used for testing the Upgrade functionality, an ERC20 token using UUPS upgradability features with dependency on a Governance implemenation to complete the upgrade process.
 * @author astor@swtch.network
 */
contract UUPSToken is Initializable, ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    /**
     * @notice Governance implementation.
     */
    IGovernance public governance;

    /**
     * @notice ProposalId to validate with Governance implementation.
     */
    uint256 public upgradeProposalId;
    
    /**
     * @dev Initializes the contract with initial values and mints the initial supply.
     * @param name The name of the token.
     * @param symbol The symbol of the token.
     * @param initialSupply The initial supply of tokens to be minted.
     * @param admin The address that will receive the initial supply and have admin privileges.
     * @param governanceContract The address of the governance contract.
     */
    function initialize(
        string memory name, 
        string memory symbol, 
        uint256 initialSupply,
        address admin,
        IGovernance governanceContract
    ) public initializer {
        __ERC20_init(name, symbol);
        __UUPSUpgradeable_init();
        __Ownable_init(msg.sender);
        
        _mint(admin, initialSupply);  // Mint the initial supply to the admin address
        transferOwnership(admin);     // Set the admin as the owner of the contract
        governance = governanceContract;
    }

    /**
     * @dev Stage the proposal identifier, prior to approval or rejection.
     * @param proposalId Unique identifier for Governance proposal.
     */
    function proposeUpgrade(uint256 proposalId) external onlyOwner {
        upgradeProposalId = proposalId;
    }

    /**
     * @dev Required override for UUPSUpgradeable authorization.
     * Only authorized accounts can upgrade the contract.
     * @dev Complete the implementation of the governance aspects
     */
    function _authorizeUpgrade(address newImplementation) internal view override {
        // require(governance.isProposalApproved(upgradeProposalId), "Upgrade proposal not approved");
        require(upgradeProposalId > 0, "Upgrade proposal not approved");
    }
}
