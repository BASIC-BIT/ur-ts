import {BoardMoveHistoryDbEntry, Move, MultiStrategy, SpecialBoardPos, Strategy} from "./types";
import {getIndexOnPath, getOtherPlayer, isRosette, SAFE_TILES} from "./board";
import {getMoveHistory} from "./moveDatabase";
import * as readline from "readline";

export const randomStrategy: Strategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
};

export const scoreStrategy: MultiStrategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves.filter((move) => move.toTile === SpecialBoardPos.SCORED));
};

export const captureStrategy: MultiStrategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves
        .filter((move) =>
            move.toTile !== SpecialBoardPos.SCORED &&
            board.tiles[move.toTile] === getOtherPlayer(board.player)));
};

export const contestedRosetteStrategy: MultiStrategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves.filter((move) => move.toTile === 9));
};

export const rosetteStrategy: MultiStrategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves.filter((move) => isRosette(move.toTile)));
};

export const safetyStrategy: MultiStrategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves
        .filter((move) =>
            move.toTile !== SpecialBoardPos.NOT_PLAYED &&
            (move.toTile === SpecialBoardPos.SCORED ||
            SAFE_TILES.indexOf(move.toTile) !== -1)));
};

export const playPieceStrategy: MultiStrategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves
        .filter((move) => move.fromTile === SpecialBoardPos.NOT_PLAYED));
};

export const moveFarthestStrategy: Strategy = (board, possibleMoves, roll) => {
    return Promise.resolve(possibleMoves
        .reduce((candidate, cur) => {
            if(!candidate) {
                return cur;
            }

            if(candidate.toTile === SpecialBoardPos.NOT_PLAYED) {
                return cur;
            }
            if(cur.toTile === SpecialBoardPos.NOT_PLAYED) {
                return candidate;
            }
            if(candidate.toTile === SpecialBoardPos.SCORED) {
                return candidate;
            }
            if(cur.toTile === SpecialBoardPos.SCORED) {
                return cur;
            }

            return getIndexOnPath(board.player, candidate.toTile) > getIndexOnPath(board.player, cur.toTile) ? candidate : cur;
        }));
};

export const naiveStrategy: Strategy = async (board, possibleMoves, roll) => {
    const strategies = [
        captureStrategy,
        contestedRosetteStrategy,
        playPieceStrategy,
        rosetteStrategy,
        scoreStrategy,
        safetyStrategy,
    ];

    let i;
    for (i = 0; i < strategies.length; i++) {
        const strategyResults = await strategies[i](board, possibleMoves, roll);

        if (strategyResults.length === 1) {
            return strategyResults[0];
        } else if (strategyResults.length > 1) {
            return moveFarthestStrategy(board, strategyResults, roll);
        }
    }

    return moveFarthestStrategy(board, possibleMoves, roll);
};

export const naiveStrategyB: Strategy = async (board, possibleMoves, roll) => {
    const strategies = [
        captureStrategy,
        contestedRosetteStrategy,
        playPieceStrategy,
        rosetteStrategy,
        scoreStrategy,
        safetyStrategy,
    ];

    let i;
    for (i = 0; i < strategies.length; i++) {
        const strategyResults = await strategies[i](board, possibleMoves, roll);

        if (strategyResults.length === 1) {
            return strategyResults[0];
        } else if (strategyResults.length > 1) {
            return randomStrategy(board, strategyResults, roll);
        }
    }

    return randomStrategy(board, possibleMoves, roll);
};

export const aggressiveStrategy: Strategy = async (board, possibleMoves, roll) => {
    const strategies = [
        captureStrategy,
        contestedRosetteStrategy,
        rosetteStrategy,
        scoreStrategy,
    ];

    let i;
    for (i = 0; i < strategies.length; i++) {
        const strategyResults = await strategies[i](board, possibleMoves, roll);

        if (strategyResults.length === 1) {
            return strategyResults[0];
        } else if (strategyResults.length > 1) {
            return moveFarthestStrategy(board, strategyResults, roll);
        }
    }

    return moveFarthestStrategy(board, possibleMoves, roll);
};

const MINIMUM_GAMES_ML_THRESHOLD = 10;
function isMachineLearningStateValid(moveHistory: BoardMoveHistoryDbEntry[], possibleMoves: Move[]) {
    return moveHistory.length === possibleMoves.length && moveHistory.every((history) => history.wins + history.losses > MINIMUM_GAMES_ML_THRESHOLD)
}

export const machineLearningStrategy: Strategy = async (board, possibleMoves, roll) => {
    const moveHistory = await getMoveHistory(board, roll);

    if(isMachineLearningStateValid(moveHistory, possibleMoves)) {
        return moveHistory.reduce((acc, cur) => {
            if(!acc) {
                return cur;
            }

            if((cur.wins / (cur.wins + cur.losses)) > (acc.wins / (acc.wins + acc.losses))) {
                return cur;
            }

            return acc;
        }).move;
    } else {
        return randomStrategy(board, possibleMoves, roll);
    }
};
export const machineLearningSmartStrategy: Strategy = async (board, possibleMoves, roll) => {
    const moveHistory = await getMoveHistory(board, roll);

    if(isMachineLearningStateValid(moveHistory, possibleMoves)) {
        return moveHistory.reduce((acc, cur) => {
            if(!acc) {
                return cur;
            }

            if((cur.wins / (cur.wins + cur.losses)) > (acc.wins / (acc.wins + acc.losses))) {
                return cur;
            }

            return acc;
        }).move;
    } else {
        return naiveStrategy(board, possibleMoves, roll);
    }
};

export const humanStrategy: Strategy = async (board, possibleMoves, roll) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    while(true) {
        console.log("--- LEGEND ---\n[0 ][1 ][2 ][3 ]        [4 ][5 ]\n[6 ][7 ][8 ][9 ][10][11][12][13]\n[14][15][16][17]        [18][19]\n\"NOT_PLAYED\" - Place new piece\n--- END LEGEND ---");
        const input = await new Promise((resolve) => rl.question('Select which piece to move: ', resolve));
        const move = possibleMoves.find((findMove) => findMove.fromTile.toString() === input);

        if(!move) {
            console.log("Move invalid!");
        } else {
            rl.close();
            return move;
        }
    }
};