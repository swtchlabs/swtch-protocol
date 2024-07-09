// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./ReputationScoreLibV1.sol";
import "../did/IdentityManager.sol";
import "../finance/collateral/ReputableEscrow.sol";      // IEscrow
import "../finance/collateral/ERC20ReputableEscrow.sol"; // IERC20Escrow
import "../finance/collateral/ERC721ReputableEscrow.sol";// IERC721Escrow

/**
 * @title ReputationManager
 * @author astor@swtch.network
 * @notice SWTCH ReputationManager is responsible for providing a modular and upgradeable reputation system that uses a separate library for core scoring logic. The ReputationSystem integrates with the IdentityManager and various Escrow contracts while using the ReputationScoreLib for score calculations.
 */
contract ReputationManager is Initializable, OwnableUpgradeable {
    using ReputationScoreLib for ReputationScoreLib.Score;
    using ReputationScoreLib for ReputationScoreLib.Action;

    IdentityManager public identityManager;
    ReputableEscrow public ethEscrow;
    ERC20ReputableEscrow public erc20Escrow;
    ERC721ReputableEscrow public erc721Escrow;

    struct ParticipantScore {
        ReputationScoreLib.Score asConsumer;
        ReputationScoreLib.Score asProducer;
        mapping(bytes32 => uint256) productScores;
        mapping(bytes32 => ReputationScoreLib.Action) actions;
    }

    mapping(address => ParticipantScore) public participantScores;

    event ScoreUpdated(address indexed did, bool isProducer, uint256 newScore);
    event ProductScoreUpdated(address indexed did, bytes32 indexed productHash, uint256 newScore);
    event ActionWeightSet(address indexed did, bytes32 indexed actionType, uint256 weight);

    function initialize(
        address _identityManagerAddress,
        address _ethEscrow,
        address _erc20Escrow,
        address _erc721Escrow
    ) public initializer {
        __Ownable_init(msg.sender);
        identityManager = IdentityManager(_identityManagerAddress);
        ethEscrow = ReputableEscrow(_ethEscrow);
        erc20Escrow = ERC20ReputableEscrow(_erc20Escrow);
        erc721Escrow = ERC721ReputableEscrow(_erc721Escrow);
    }

    modifier onlyRegisteredDID(address did) {
        require(identityManager.isOwnerOrDelegate(did, msg.sender), "Not authorized for this DID");
        _;
    }

    function updateScore(address did, bool isProducer, bytes32 actionType, bool success) public onlyRegisteredDID(did) {
        ParticipantScore storage participant = participantScores[did];
        ReputationScoreLib.Score storage score = isProducer ? participant.asProducer : participant.asConsumer;
        ReputationScoreLib.Action storage action = participant.actions[actionType];

        ReputationScoreLib.updateScore(score, action, success);

        emit ScoreUpdated(did, isProducer, score.score);
    }

    function setActionWeight(address did, bytes32 actionType, uint256 weight) public onlyOwner {
        participantScores[did].actions[actionType].weight = weight;
        emit ActionWeightSet(did, actionType, weight);
    }

    function updateProductScore(address did, bytes32 productHash, uint256 newScore) public onlyRegisteredDID(did) {
        require(newScore <= 10000, "Score must be between 0 and 10000");
        participantScores[did].productScores[productHash] = newScore;
        emit ProductScoreUpdated(did, productHash, newScore);
    }

    function getCompleteProfile(address did) public view returns (uint256, uint256, uint256) {
        ParticipantScore storage participant = participantScores[did];
        return (
            ReputationScoreLib.calculateCurrentScore(participant.asConsumer),
            ReputationScoreLib.calculateCurrentScore(participant.asProducer),
            ethEscrow.getBalance()
        );
    }

    function getProductScore(address did, bytes32 productHash) public view returns (uint256) {
        return participantScores[did].productScores[productHash];
    }

    // Escrow integration 

    function initiateEscrow() external payable {
        ethEscrow.deposit{value: msg.value}();
    }

    function releaseEscrow() external onlyOwner {
        ethEscrow.releaseToBeneficiary();
    }

    function refundEscrow() external onlyOwner {
        ethEscrow.refundToDepositor();
    }

    // ERC20 Escrow integration
    function initiateERC20Escrow(uint256 amount) external {
        IERC20 token = IERC20(erc20Escrow.token());
        require(token.transferFrom(msg.sender, address(erc20Escrow), amount), "Transfer failed");
        erc20Escrow.deposit(amount);
    }

    function releaseERC20Escrow() external onlyOwner {
        erc20Escrow.releaseToBeneficiary();
    }

    function refundERC20Escrow() external onlyOwner {
        erc20Escrow.refundToDepositor();
    }

    // ERC721 Escrow integration
    function initiateERC721Escrow() external {
        erc721Escrow.deposit();
    }

    function releaseERC721Escrow() external onlyOwner {
        erc721Escrow.releaseToBeneficiary();
    }

    function refundERC721Escrow() external onlyOwner {
        erc721Escrow.refundToDepositor();
    }

    // Administrative functions

    function setIdentityManager(address _newIdentityManager) external onlyOwner {
        identityManager = IdentityManager(_newIdentityManager);
    }

    function setEthEscrow(address _newEthEscrow) external onlyOwner {
        ethEscrow = ReputableEscrow(_newEthEscrow);
    }

    function setERC20Escrow(address _newERC20Escrow) external onlyOwner {
        erc20Escrow = ERC20ReputableEscrow(_newERC20Escrow);
    }

    function setERC721Escrow(address _newERC721Escrow) external onlyOwner {
        erc721Escrow = ERC721ReputableEscrow(_newERC721Escrow);
    }
}