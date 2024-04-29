// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title PaymentChannel
 * @author astor@swtch.network
 * @notice PaymentChannel represents a basic ether sender/receiver relationship for payments.
 */
contract PaymentChannel {
    address payable public sender;
    address payable public receiver;
    uint256 public expiration;
    uint256 public deposit;

    constructor(address payable _receiver, uint256 duration) payable {
        sender = payable(msg.sender);
        receiver = _receiver;
        expiration = block.timestamp + duration;
        deposit = msg.value;
    }

    function close(uint256 amount, bytes memory signature) external {
        require(msg.sender == receiver, "Only receiver can close the channel");
        require(isValidSignature(amount, signature), "Invalid signature");
        require(amount <= deposit, "Amount exceeds deposit");

        receiver.transfer(amount);
        if (address(this).balance > 0) {
            sender.transfer(address(this).balance);
        }
    }

    function isValidSignature(uint256 amount, bytes memory signature) internal view returns (bool) {
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, amount)));
        return recoverSigner(message, signature) == sender;
    }

    function extend(uint256 newExpiration) external {
        require(msg.sender == sender, "Only sender can extend expiration");
        require(newExpiration > expiration, "New expiration must be later than current expiration");
        expiration = newExpiration;
    }

    function claimTimeout() external {
        require(block.timestamp >= expiration, "Channel not yet expired");
        sender.transfer(address(this).balance);
    }

    function recoverSigner(bytes32 message, bytes memory sig) internal pure returns (address) {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(message, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}
