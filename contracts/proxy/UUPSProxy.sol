// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title UUPS (Universal Upgradeable Proxy Standard) Proxy
 * @author astor@swtch.network
 * @notice UUPS Proxy handles upgrading of the implementation contract and delegates all other calls to the implementation.
 */
contract UUPSProxy {

    // The address of the implementation contract
    address internal _implementation;

    // The address of the administrator who can upgrade the proxy
    address public admin;

    event AdminChanged(address previousAdmin, address newAdmin);
    event Upgraded(address indexed implementation);

    /**
     * @dev Initializes the proxy with an initial implementation contract and sets the deployer as the admin.
     * @param initialImpl The address of the initial implementation contract.
     */
    constructor(address initialImpl) {
        require(initialImpl != address(0), "Implementation not valid");
        _implementation = initialImpl;
        admin = msg.sender; // Setting the deployer as the initial admin.
    }

    /**
     * @dev Fallback function that delegates all calls to the implementation contract.
     *      Includes payable support.
     */
    fallback() external payable {
        _delegate(_implementation);
    }

    receive() external payable {
        // TODO delegate 
    }

    /**
     * @dev Delegatecall implementation which forwards all calls to the implementation contract.
     * @param implementation The address of the implementation to delegate to.
     */
    function _delegate(address implementation) internal {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    /**
     * @dev Upgrades the proxy to a new implementation contract.
     * @param newImplementation The address of the new implementation contract.
     */
    function upgradeTo(address newImplementation) external {
        require(msg.sender == admin, "Unauthorized");
        require(newImplementation != address(0), "Invalid implementation address");
        require(isContract(newImplementation), "Cannot set a proxy implementation to a non-contract address");
        _implementation = newImplementation;

        emit Upgraded(_implementation);
    }

    /**
     * @dev Utility function to check if an address is a contract,
     *      which is necessary to prevent contracts from being self-destructed or zeroed out.
     * @param addr The address to be checked.
     * @return bool True if the address hosts a contract, false otherwise.
     */
    function isContract(address addr) internal view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    /**
     * @dev Allows the current administrator to pass the role to a new administrator.
     * @param newAdmin The address of the new administrator.
     */
    function changeAdmin(address newAdmin) external {
        require(msg.sender == admin, "Unauthorized");
        require(newAdmin != address(0), "Invalid admin address");
        address previousAdmin = admin;
        admin = newAdmin;

        emit AdminChanged(previousAdmin, admin);
    }
}
