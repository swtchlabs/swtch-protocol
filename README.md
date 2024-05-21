# SWTCH Protocol

The SWTCH Protocol aims to create a robust infrastructure that integrates various decentralized services with a built-in settlement layer across multiple blockchains. By initially targeting EVM-based blockchains, particularly Layer 2 solutions, the project seeks to minimize economic costs associated with information storage, making it more accessible and efficient.

SWTCH intends to deploy the SWTCH Protocol to multiple blockchains, starting with Arbitrum, Ethereum, Avalache, Polygon and other EVM chains, then Solana and Cosmos.
The latter deployments will require the SWTCH Protocol smart contracts to be written in a various languages and frameworks other than Solidity and will merit their own repository.

## Contexts
- DAO: A decentralized autonomous organization that will eventually take on administrative roles, enabling community driven governance and management of the protocol.
- Identity: Incorporation of ERC-725 and ERC-735 standards along with identity solutions like Civic and Polygon ID to provide a robust identity framework for secure and verifiable interactions.
- Network: Focuses on the registration and management of network services, including messaging, storage, computation and agent services. This context aims to provide a comprehensive infrastructure for decentralized applications.
- Secrets: Decentralized secrets management to support network services, ensuring secure handling of sensitive information.
- Payments: Facilitates the creation and management of payment channels, proof of funds, escrow services and subscriptions, enabling seamless financial interactions within the network.
- Token: Manages creation and administration of various token standards (ERC-20,ERC-721,ERC-1155,ERC-404,ERC++), integrating them with identity for network services and information, enhancing utility and interoperability.

## Payments and Settlement
Outline of the payment and settlement processes handled by the protocol:

- Identity Requirement: Establishing an identity is a prerequisite for listing network services or information.
- Service and Information Listing: Owners or operators can register their services or information, potentially setting associated fees.
- SDK Integration: Facilitates the integration of network services and information, making them accessible and manageable through the SWTCH Protocol.
- User Interaction: Users can view, purchase, and interact with listed services and information.
- Payment Handling: Payments are processed through the SWTCH Protocol, with owners or operators withdrawing their earnings, minus a minor platform maintenance fee.

## Workflows
Essential interactions within the SWTCH Protocol:

- Wallet Management: Integration with wallets like MetaMask for connection and disconnection.
- Identity Management: Processes for creating, registering, and managing identities.
- Network Management: Processes for creating, registering, network services and network information.
- Secrets Management: Handling of decentralized secrets.
- Payments Management: Creation and management of payment mechanisms associated with network services and network information.
- Tokens Management: Handling token creation, registration, and management.

## TLDR
The project covers a wide range of functionalities, from identity management to decentralized payments and token management, providing a holistic solution for decentralized applications.
By supporting multiple blockchains and integrating various identity solutions, the SWTCH Protocol aims to be highly interoperable, catering to a broad user base.
The detailed workflows emphasize user interaction and ease of use, which is crucial for adoption.

## Run
Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/{$filename}.ts
```
