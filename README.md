# SWTCH Protocol

SWTCH Protocol is a set of smart contracts which enables management of secrets, networks, tokens, finance, subscriptions and the SWTCH DAO.

SWTCH intends to deploy the SWTCH Protocol to multiple blockchains, starting with Ethereum, then Avalache, Polygon and other EVM chains, then Solana and Cosmos.

The latter deployments will require the SWTCH Protocol smart contracts to be written in a language other than Solidity and will merit its own repository.

## Features
- Access: Provides Ownership and Role Support.
- DAO: Generic DAO Structure.
- Finance: Finance Primitives for trustless P2P interactions.
- Proxy: Provides Proxy Support.
- Secrets: Secrets Management and Storage Support.
- Token: Base ERC-20,ERC-721, next ERC-1155,ERC-404 Support.

## Run
Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/{$filename}.ts
```
