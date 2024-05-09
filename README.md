# SWTCH Protocol

SWTCH Protocol is a set of smart contracts which enables management of network services, secrets, tokens, finance, subscriptions and the SWTCH DAO.

SWTCH intends to deploy the SWTCH Protocol to multiple blockchains, starting with Arbitrum, Ethereum, Avalache, Polygon and other EVM chains, then Solana and Cosmos.

The latter deployments will require the SWTCH Protocol smart contracts to be written in a language other than Solidity and will merit its own repository.

## Features
- Access: Provides Ownership and Role Support.
- DAO: Generic DAO Structure in preparation for the SWTCH DAO deployment.
- DeFi: Finance Primitives for trustless P2P interactions.
- Network Services: Provides creating and joining decentralized service groups.
- Secrets: Secrets Management and Storage Support.
- Token: Base creation, deployment and management of ERC-20,ERC-721,ERC-1155 and ERC-404.

## Run
Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/{$filename}.ts
```
