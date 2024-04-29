// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

/**
 * @title BiDirectionalPaymentChannel
 * @author astor@swtch.network
 * @notice BiDirectionalPaymentChannel is a simple bi-directional payment channel between two parties, as the name implies.
 */
contract BiDirectionalPaymentChannel {
    address public partyA;
    address public partyB;
    uint256 public expiration;
    mapping(address => uint256) public balances;

    constructor(address _partyB, uint256 duration) payable {
        partyA = msg.sender;
        partyB = _partyB;
        expiration = block.timestamp + duration;
        balances[partyA] = msg.value;
    }

    function close(uint256 amountA, uint256 amountB, bytes memory signatureA, bytes memory signatureB) external {
        require(msg.sender == partyA || msg.sender == partyB, "Not a participant");
        require(isValidSignature(partyA, amountA, amountB, signatureA), "Invalid signature from party A");
        require(isValidSignature(partyB, amountA, amountB, signatureB), "Invalid signature from party B");

        require(amountA <= balances[partyA], "Insufficient balance for party A");
        require(amountB <= balances[partyB], "Insufficient balance for party B");

        payable(partyA).transfer(amountA);
        payable(partyB).transfer(amountB);
        // TODO Handle remaining balance, if any.
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

    function isValidSignature(address signer, uint256 amountA, uint256 amountB, bytes memory signature) internal view returns (bool) {
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, amountA, amountB)));
        return recoverSigner(message, signature) == signer;
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function deposit() external payable {
        require(msg.sender == partyB, "Only party B can deposit");
        balances[partyB] += msg.value;
    }

    function extend(uint256 newExpiration) external {
        require(msg.sender == partyA, "Only party A can extend expiration");
        require(newExpiration > expiration, "New expiration must be later than current expiration");
        expiration = newExpiration;
    }

    function claimTimeout() external {
        require(block.timestamp >= expiration, "Channel not yet expired");
        payable(partyA).transfer(address(this).balance);
    }
}
