import {playGame} from "./board";
import {
    aggressiveStrategy,
    humanStrategy, machineLearningSmartStrategy,
    machineLearningStrategy,
    naiveStrategy,
    naiveStrategyB,
    randomStrategy
} from "./strategy";
import {Player} from "./types";
import {connect, disconnect} from "./moveDatabase";
import {CONFIG} from "./config";

async function main() {
    await connect();

    const startTime = Date.now();
    const PLAY_GAMES = CONFIG.PLAY_GAMES;
    let gameCount = 0;
    let whiteWins = 0;
    let blackWins = 0;

    while(gameCount < PLAY_GAMES) {
        const winner = await playGame(CONFIG.WHITE_STRATEGY, CONFIG.BLACK_STRATEGY);
        if(winner === Player.WHITE) {
            whiteWins++;
        } else {
            blackWins++;
        }

        if(gameCount % 1000 === 0 && gameCount > 0) {
            console.log(`Games played: ${gameCount}`);
        }
        gameCount++;
    }

    console.log(`White: ${whiteWins} / ${gameCount} (${100 * whiteWins/gameCount}%)`);
    console.log(`Black: ${blackWins} / ${gameCount} (${100 * blackWins/gameCount}%)`);
    const endTime = Date.now();
    console.log(`Elapsed Time: ${(endTime - startTime) / 1000} seconds`);
    console.log(`Performance: ${PLAY_GAMES / ((endTime - startTime) / 1000)} games per second`);

    await disconnect();
}

main();