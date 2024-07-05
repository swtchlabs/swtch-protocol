// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../did/IdentityManager.sol";

/**
 * @title NetworkManager
 * @author astor@swtch.network
 * @notice SWTCH NetworkManager represents a verifiable web services index using DIDs for providers, where user/operators may register and offer their web services for cryptocurrency.
 */
contract NetworkManager is OwnableUpgradeable {

    IdentityManager private didRegistry; // Reference to the DID registry

    struct NetworkService {
        address owner;
        string serviceDetails;
        bool isActive;
    }

    mapping(address => NetworkService) public networkServices;
    address[] public serviceProviders;

    event NetworkAdded(address indexed provider, string serviceDetails);
    event NetworkUpdated(address indexed provider, string oldServiceDetails, string newServiceDetails);
    event NetworkRemoved(address indexed provider, string serviceDetails);

    modifier onlyDIDOwner(address did) {
        require(didRegistry.isOwnerOrDelegate(did, msg.sender), "Only DID owner can perform this action");
        _;
    }

    function initialize(address didRegistryAddress_) public initializer {
        __Ownable_init(msg.sender);

        didRegistry = IdentityManager(didRegistryAddress_); // Initialize with DID Registry address
    }

    function addNetworkService(address provider, string memory serviceDetails) external onlyDIDOwner(provider) {
        require(provider != address(0), "Invalid address");
        require(networkServices[provider].owner == address(0), "Service already exists");

        networkServices[provider] = NetworkService({
            owner: provider,
            serviceDetails: serviceDetails,
            isActive: true
        });

        serviceProviders.push(provider);
        emit NetworkAdded(provider, serviceDetails);
    }

    function getNetworkService(address provider) external view returns(NetworkService memory) {
        return networkServices[provider];
    }

    function updateNetworkService(address provider, string memory newServiceDetails) external onlyDIDOwner(provider) {
        require(provider != address(0), "Invalid address");
        NetworkService storage service = networkServices[provider];
        require(service.owner != address(0), "Service does not exist");

        // Storing old details for event emission
        string memory oldServiceDetails = service.serviceDetails;
        service.serviceDetails = newServiceDetails;

        emit NetworkUpdated(provider, oldServiceDetails, newServiceDetails);
    }

    function removeNetworkService(address provider) external onlyDIDOwner(provider) {
        require(provider != address(0), "Invalid address");
        NetworkService memory service = networkServices[provider];
        require(service.owner != address(0), "Service does not exist");

        // Emitting detailed removal event including service details
        emit NetworkRemoved(provider, service.serviceDetails);

        // Clearing the struct data
        delete networkServices[provider];

        // Remove provider from serviceProviders array
        for (uint256 i = 0; i < serviceProviders.length; i++) {
            if (serviceProviders[i] == provider) {
                serviceProviders[i] = serviceProviders[serviceProviders.length - 1];
                serviceProviders.pop();
                break;
            }
        }
    }

    function isServiceProvider(address provider) external view returns (bool) {
        return networkServices[provider].owner != address(0);
    }

    function getServiceProviders() external view returns (address[] memory) {
        return serviceProviders;
    }
}
