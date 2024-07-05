// SPDX-License-Identifier: GPL-3
pragma solidity ^0.8.24;

library ReputationScoreLib {
    uint256 constant DECAY_PERIOD = 30 days;
    uint256 constant DECAY_FACTOR = 95; // 95% of score remains after each period
    uint256 constant MAX_SCORE = 10000;

    struct Score {
        uint256 score; // Out of 10000 for more granularity
        uint256 lastUpdateTimestamp;
    }

    struct Action {
        uint256 weight;
        uint256 count;
    }

    function updateScore(Score storage score, Action storage action, bool success) internal {
        applyDecay(score);
        action.count++;

        if (success) {
            score.score = (score.score + action.weight) > MAX_SCORE ? MAX_SCORE : score.score + action.weight;
        } else {
            score.score = score.score > action.weight ? score.score - action.weight : 0;
        }

        score.lastUpdateTimestamp = block.timestamp;
    }

    function applyDecay(Score storage score) internal {
        uint256 periods = (block.timestamp - score.lastUpdateTimestamp) / DECAY_PERIOD;
        if (periods > 0) {
            for (uint i = 0; i < periods; i++) {
                score.score = (score.score * DECAY_FACTOR) / 100;
            }
            score.lastUpdateTimestamp = block.timestamp;
        }
    }

    function calculateCurrentScore(Score memory score) internal view returns (uint256) {
        uint256 periods = (block.timestamp - score.lastUpdateTimestamp) / DECAY_PERIOD;
        uint256 currentScore = score.score;
        for (uint i = 0; i < periods; i++) {
            currentScore = (currentScore * DECAY_FACTOR) / 100;
        }
        return currentScore;
    }
}