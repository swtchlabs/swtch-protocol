// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title SimpleProxy
 * @author astor@swtch.network
 * @notice SimpleProxy is a simplified version of a transparent proxy which uses an explicit admin role and delegate calls for logic upgrades. 
 */
contract SimpleProxy {
    address public admin;
    address public implementation;

    event Upgraded(address indexed implementation);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);

    constructor(address _logic) {
        admin = msg.sender;
        implementation = _logic;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Unauthorized: caller is not the admin");
        _;
    }

    function changeAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "Invalid address for new admin");
        emit AdminChanged(admin, _newAdmin);
        admin = _newAdmin;
    }

    function upgrade(address _newLogic) public onlyAdmin {
        require(_newLogic != address(0), "Invalid address for new logic");
        implementation = _newLogic;
        emit Upgraded(_newLogic);
    }

    fallback() external payable {
        _delegate(implementation);
    }

    function _delegate(address impl) internal {
        require(impl != address(0), "Implementation contract not set");

        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)

            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

    receive() external payable {
        _delegate(implementation);
    }
}
