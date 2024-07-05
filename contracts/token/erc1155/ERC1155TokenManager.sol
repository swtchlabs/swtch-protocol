// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./DIDRestrictedERC1155.sol";
import "../../did/IdentityManager.sol";

contract ERC1155TokenManager is OwnableUpgradeable {

    IdentityManager private identityManager;

    uint256 tokenIndex = 0;

    struct Token {
        address deployer;
        string uri;
        address tokenAddress;
    }
    Token[] private tokens;

    event TokenDeployed(address indexed owner, address indexed tokenAddress, string tokenType);

    function initialize(address identityManagerAddress) public initializer {
        __Ownable_init(msg.sender);
        identityManager = IdentityManager(identityManagerAddress);
    }

    function getTokenIndex() public view returns (uint256) {
        return tokenIndex;
    }

    function getToken(uint256 index) public view returns(Token memory) {
        return tokens[index];
    }

    function deployDIDRestrictedERC1155(string memory uri) public {
        address didDeployer = msg.sender;
        require(identityManager.isOwnerOrDelegate(didDeployer, didDeployer), "Deployer is not a registered DID");
        DIDRestrictedERC1155 newToken = new DIDRestrictedERC1155(uri, address(identityManager));
        
        address tokenAddress = address(newToken);
        tokens.push(Token({deployer: didDeployer, uri: uri, tokenAddress: tokenAddress}));
        
        // increment index
        tokenIndex++;
        // emit token reference
        emit TokenDeployed(didDeployer, tokenAddress, "DIDRestrictedERC1155");
    }

}