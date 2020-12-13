import {humanStrategy, machineLearningSmartStrategy} from "./strategy";

const HUMAN_CONFIG = {
    DEBUG: true,
    PLAY_GAMES: 1,
    WHITE_STRATEGY: humanStrategy,
    BLACK_STRATEGY: machineLearningSmartStrategy,
};

const TRAINING_CONFIG = {
    DEBUG: false,
    PLAY_GAMES: 40000,
    WHITE_STRATEGY: machineLearningSmartStrategy,
    BLACK_STRATEGY: machineLearningSmartStrategy,
};

export const CONFIG = TRAINING_CONFIG;