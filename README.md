# SWTCH Protocol

## What is SWTCH Protocol?
The SWTCH Protocol aims to create a robust infrastructure that integrates various decentralized services with a built-in settlement layer across multiple blockchains. By initially targeting EVM-based blockchains, particularly Layer 2 solutions, the project seeks to minimize economic costs associated with information storage, making it more accessible and efficient.

SWTCH Protocol is a means to allow developers to monetize APIs and Web Services using minimal blockchain knowledge to implement a pay-per-use or subscription to help you accept and receive crypto.

## Protocol Architecture
```md
                 +------------------+    +--------------------+
                 | IdentityManager  |    | ReputationManager  |
                 +------------------+    +--------------------+
                           |                       |
                           |                       |
                           v                       v
                 +----------------------------------+
                 |        Protocol Core             |
                 |        (Governance)              |
                 |                                  |
                 | +----------+  +--------------+   |
                 | |Proposals |  |    Voting    |   |
                 | +----------+  +--------------+   |
                 |                                  |
                 | +----------+  +--------------+   |
                 | |Activation|  |Deactivation  |   |
                 | +----------+  +--------------+   |
                 |                                  |
                 +----------------------------------+
                               |
                               |
                               v
                 +----------------------------------+
                 |           Contexts               |
                 |                                  |
                 |  +--------+    +--------------+  |
                 |  |Identity|    |  Reputation  |  |
                 |  +--------+    +--------------+  |
                 |                                  |
                 |  +--------+    +--------------+  |
                 |  |Networks|    |   Secrets    |  |
                 |  +--------+    +--------------+  |
                 |                                  |
                 |  +--------+                      |
                 |  | Tokens |                      |
                 |  +--------+                      |
                 |                                  |
                 +----------------------------------+
```

This diagram illustrates the high-level architecture of the SWTCH Protocol:
- IdentityManager and ReputationManager sit at the top level, overseeing their respective domains.
- The Protocol Core functions as the governance layer, managing proposals, voting, and the activation/deactivation of contexts.
- The Contexts layer includes the key components of the protocol: Identity, Reputation, Networks, Secrets, and Tokens.

The Protocol Core's governance mechanisms allow for community-driven decision-making and evolution of the protocol's functionalities.


## Deployments 
SWTCH intends to deploy the SWTCH Protocol to multiple blockchains, starting with Arbitrum, Ethereum, Avalache, Polygon and other EVM chains, then Solana and Cosmos.

The latter deployments will require the SWTCH Protocol smart contracts to be written in a various languages and frameworks other than Solidity and will merit their own repository.

## Contexts
- Protocol: 
    - A decentralized autonomous organization that will eventually take on administrative roles, enabling community driven governance and management of the protocol. 
    - At inception the SWTCH Foundation will manage governance, as we on-board new community DAO members.
- Identity: 
    - Incorporation of ERC-725 and ERC-735 standards along with identity solutions like Civic and Polygon ID to provide a robust identity framework for secure and verifiable interactions.
- Reputation: 
    - Allows the Protocol to record the user actions and provide a score for their positive or negative actions. 
    - Users and Operators may benefit from reviewing the scores to decided on a reliable resource.
- Network: 
    - Focuses on the registration and management of network services, including messaging, storage, computation and agent services. 
    - This context aims to provide a comprehensive index of the infrastructure for decentralized applications.
- Secrets: 
    - Decentralized secrets management to support network services and web apis ensure secure handling of sensitive information.
- Finance: 
    - Facilitates the creation and management of payment channels, proof of funds, escrow services and subscriptions, enabling seamless financial interactions within the network.
- Token: 
    - Manages creation and administration of various token standards (ERC-20,ERC-721,ERC-1155,ERC-404,ERC++). 
    - Integrating them with identity for network services and information, enhancing utility and interoperability.

## Payments and Settlement
Outline of the payment and settlement processes handled by the protocol:

- Identity Requirement: Establishing a decentralized identity is a prerequisite for listing network services or information.
- Service and Information Listing (Index): Owners or operators can register their services or information, potentially setting associated fees.
- SDK Integration: Facilitates the integration of network services and information, making them accessible and manageable through the SWTCH Protocol. A separate project altogether, it will provide Rust, TypeScript, Python and Go implementations.
- User Interaction: Users can view, purchase, and interact with listed services and information on the Protocol Index.
- Payment Handling: Payments are processed through the SWTCH Protocol, with owners or operators withdrawing their earnings, minus a minimal platform maintenance fee when initiating services on the decentralized Protocol.

## Workflows
Essential interactions within the SWTCH Protocol:

1. Identity Management Workflow:
    - a. User connects wallet (e.g., MetaMask)
    - b. User initiates identity creation process
    - c. Protocol verifies wallet ownership
    - d. User provides required information (adhering to ERC-725 and ERC-735 standards)
    - e. Protocol creates and registers the decentralized identity
    - f. User receives confirmation and identity credentials

2. Network Service Registration Workflow:
    - a. Service provider connects with verified identity
    - b. Provider initiates service registration process
    - c. Provider inputs service details (type, description, pricing, etc.)
    - d. Protocol verifies provider's credentials and service information
    - e. Service is registered on the Protocol Index
    - f. Provider receives confirmation and service ID

3. Payment Channel Creation Workflow:
    - a. User selects a service from the Protocol Index
    - b. User initiates payment channel creation
    - c. Protocol verifies user's identity and funds
    - d. Smart contract creates the payment channel
    - e. User deposits initial funds into the channel
    - f. Service provider is notified of the new payment channel
    - g. Channel is ready for use

4. Reputation Management Workflow:
    - a. User or service provider performs an action within the network
    - b. Protocol records the action
    - c. Action is evaluated based on predefined criteria
    - d. Reputation score is updated accordingly
    - e. Updated score is recorded on the blockchain
    - f. User or provider can view their updated reputation

5. Token Creation and Management Workflow:
    - a. Token creator connects with verified identity
    - b. Creator selects token standard (ERC-20, ERC-721, etc.)
    - c. Creator inputs token details (name, symbol, supply, etc.)
    - d. Protocol verifies creator's credentials and token information
    - e. Smart contract deploys the new token
    - f. Token is registered with the Protocol
    - g. Creator receives confirmation and token contract address

## Summary
The project covers a wide range of functionalities, from identity management to decentralized payments and token management, providing a holistic solution for decentralized applications.
By supporting multiple blockchains and integrating various identity solutions, the SWTCH Protocol aims to be highly interoperable, catering to a broad user base.
The detailed workflows emphasize user interaction and ease of use, which is crucial for adoption.

## Building and Running
The project was built using Node v20.11.1 lts/iron

Install Node using NVM with the 
[Node Version Manager Installation instructions](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)

Install the Node version.
```sh
nvm install lts/iron
```

Configure the Node version.
```sh
nvm use lts/iron
```

At this point you should be ready to build. Check by running the following commands which should output their respective versions:
```sh
node -v && npm -v
```

Now install the packages with NPM:
```sh
npm i
```

Try running some of the following tasks:
```shell
npx hardhat clean && npx hardhat compile
```

```shell
npx hardhat test
```

## Contact and Support 
For any inquiries email astor[@]swtch.network