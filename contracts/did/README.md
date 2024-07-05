# Decentralized Identity

## Role of Each Contract
- ERC725: Primarily used for identity management, it allows for the control and management of identity through keys and values.
- ERC725X and ERC725Y: Extensions of ERC725, where ERC725X allows for execution of arbitrary operations (including sending Ether) and ERC725Y provides for storage and management of arbitrary data.
- ERC735: Focuses on claims management, allowing claims to be made against an identity. These can be attestations made by third parties (e.g., verification of an identity attribute).

## Integrating ERC725 and Extensions
These contracts will form the backbone of the identity management in the SWTCH DID system:

- Owner and Key Management: Use ERC725 to handle key management and ownership control functionalities of DIDs. Each DID can correspond to an instance of an ERC725 contract, encapsulating identity details.
- Executing Operations: Leverage ERC725X for functionalities where identities need to perform actions like sending transactions or interacting with other contracts.
- Data Management: Use ERC725Y to store and manage data associated with DIDs, such as DID documents or other identity attributes that need persistent storage on the blockchain.

## Integrating ERC735 for Claim Management
This will add a layer to handle claims on identities:

- Claim Storage and Retrieval: Integrate ERC735 functions to store and retrieve claims made against DIDs. This enables your DID Registry to support verifiable credentials as part of the DID documents.
- Claim Lifecycle: Implement functionalities to add, verify, and remove claims. These can be used to support assertions like identity verification, qualifications, and other credentials.

## DID Document Composition
Use data from ERC725Y and claims from ERC735 to dynamically compose DID documents:

- Automatically Generate DID Documents: When a DID is queried, the registry can pull data from ERC725Y and associated claims from ERC735 to compile a complete DID document. This document could include public keys, authentication protocols, service endpoints, and associated claims.

## Smart Contract Interaction
Create a master DID Registry contract that interacts with these underlying contracts:

- Deploy and Link Contracts: When a new DID is registered, automatically deploy new instances of ERC725, ERC725X, and ERC735, or link to existing ones if applicable. 
This modular approach allows each identity to be managed independently but consistently.
- Inter-Contract Communication: Ensure that your DID Registry can interact with these contracts to execute operations, update keys, or manage claims as required by the DID operations.

## Security and Access Control
Ensure robust access control and security practices:

- Permissions and Roles: Define roles and permissions carefully, especially who can update keys or make claims. Use the ownership and key management features of ERC725 to enforce these rules.
- Event Handling and Logging: Utilize events from all these contracts for auditing and tracking changes in DIDs, keys, data, and claims.

