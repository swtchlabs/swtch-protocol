// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

contract SignatureVerifier {
    
    function isValidSignature(address signer, uint256 amount, bytes memory signature, address contractAddress) public pure returns (bool) {
        bytes32 message = prefixed(keccak256(abi.encodePacked(contractAddress, amount)));
        return recoverSigner(message, signature) == signer;
    }

    function recoverSigner(bytes32 message, bytes memory sig) public pure returns (address) {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(message, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (uint8, bytes32, bytes32) {
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

    function prefixed(bytes32 hash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}