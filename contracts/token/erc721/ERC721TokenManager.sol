// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./DIDRestrictedERC721.sol";
import "../../did/IdentityManager.sol";

contract ERC721TokenManager is OwnableUpgradeable {
    IdentityManager private identityManager;

    uint256 tokenIndex = 0;

    struct Token {
        address deployer;
        string name;
        string symbol;
        address tokenAddress;
    }
    // Mapping of token address to the token deployment
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

    function deployDIDRestrictedERC721(string memory name, string memory symbol) public {
        address didDeployer = msg.sender;
        require(identityManager.isOwnerOrDelegate(didDeployer, didDeployer), "Deployer is not a registered DID");
        DIDRestrictedERC721 newToken = new DIDRestrictedERC721(name, symbol, address(identityManager));

        address tokenAddress = address(newToken);
        tokens.push(Token({deployer: didDeployer, name: name, symbol: symbol, tokenAddress: tokenAddress}));

        // increment index
        tokenIndex++;
        // emit token reference
        emit TokenDeployed(didDeployer, tokenAddress, "DIDRestrictedERC721");
    }

    // Additional functions for managing ERC721 tokens could include transfer of ownership, updating token metadata, etc.
}
