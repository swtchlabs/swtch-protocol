// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

interface IGovernance {
    function isProposalApproved(uint256 proposalId) external view returns (bool);
}

contract SWTCHProtocol is Initializable, OwnableUpgradeable, IGovernance {   
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool approved;
    }

    mapping(uint256 => Proposal) public proposals;
    address[] public contextAddresses;
    uint256 public proposalCount;

    struct Context {
        string name;
        address implementation;
        bool active;
        uint256 issuedAt;
    }
    
    mapping(address => Context) public contexts;
    uint256 public totalContexts;
    
    ERC20Upgradeable public swtchToken;
    mapping(address => bool) public members;
    uint256 public membershipFee;
    
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event ProposalApproved(uint256 indexed proposalId);
    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);
    event ContextRegistered(address indexed ctx, string name);
    event ContextActiveChanged(address indexed ctx, bool active);

    function initialize(address _swtchToken, uint256 _membershipFee) public initializer {
        __Ownable_init(msg.sender);
        swtchToken = ERC20Upgradeable(_swtchToken);
        membershipFee = _membershipFee;
    }

    modifier onlyMember() {
        require(members[msg.sender], "Not a member");
        _;
    }

    function createProposal(string memory description, uint256 duration) public onlyMember {
        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            executed: false,
            approved: false
        });
        emit ProposalCreated(proposalCount, msg.sender, description);
    }

    function vote(uint256 proposalId, bool support) public onlyMember {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "Voting is not active");
        
        uint256 votes = swtchToken.balanceOf(msg.sender);
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
    }

    function executeProposal(uint256 proposalId) public onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        if (proposal.forVotes > proposal.againstVotes) {
            proposal.approved = true;
            emit ProposalApproved(proposalId);
        }
        proposal.executed = true;
    }

    function isProposalApproved(uint256 proposalId) public view override returns (bool) {
        return proposals[proposalId].approved;
    }

    function applyForMembership() public {
        require(swtchToken.transferFrom(msg.sender, address(this), membershipFee), "Membership fee transfer failed");
        members[msg.sender] = true;
        emit MemberAdded(msg.sender);
    }

    function removeMember(address member) public onlyOwner {
        members[member] = false;
        emit MemberRemoved(member);
    }

    function registerContext(address ctx, string memory name) public onlyOwner {
        require(contexts[ctx].implementation == address(0), "Context already registered");
        contexts[ctx] = Context({
            implementation: ctx, 
            name: name,
            active: true,
            issuedAt: block.timestamp
        });
        contextAddresses.push(ctx);
        totalContexts++;
        emit ContextRegistered(ctx, name);
    }

    function setContextActive(address ctx, bool active) public onlyOwner {
        require(contexts[ctx].implementation != address(0), "Context not registered");
        require(contexts[ctx].active != active, "Context active already set");
        contexts[ctx].active = active;
        emit ContextActiveChanged(ctx, active);
    }

    function getContext(address ctx) public view returns(Context memory) {
        return contexts[ctx];
    }

    function getActiveContexts() public view returns(address[] memory) {
        address[] memory activeContexts = new address[](totalContexts);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < totalContexts; i++) {
            address ctx = contextAddresses[i];
            if (contexts[ctx].active) {
                activeContexts[activeCount] = ctx;
                activeCount++;
            }
        }
        // Resize the array to fit only active contexts
        assembly {
            mstore(activeContexts, activeCount)
        }
        
        return activeContexts;
    }
}