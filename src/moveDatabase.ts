import {BoardMoveHistory, BoardMoveHistoryDbEntry, BoardState, Player, RollResult} from "./types";
import {generateNotation} from "./board";

const {MongoClient} = require('mongodb');

const URL = "mongodb://localhost:27017";

const DB_NAME = "ur";

const client = new MongoClient(URL);
let db;
let collection;

export async function connect(): Promise<void> {
    await client.connect();
    db = client.db("ur");
    collection = db.collection("move_history");
}

function getUniqueBoardMoveHistory(moves: BoardMoveHistory[]): BoardMoveHistory[] {
    return moves.reduce((acc, cur) => {
        if(acc.find((findMove) => findMove.board === cur.board && findMove.move.fromTile === cur.move.fromTile && findMove.move.toTile === cur.move.toTile)) {
            return acc;
        }
        return [
            ...acc,
            cur,
        ];

    }, [] as BoardMoveHistory[])
}

export async function addGame(moves: BoardMoveHistory[], winner: Player): Promise<void> {
    const uniqueMoves = getUniqueBoardMoveHistory(moves);
    // if(moves.length !== uniqueMoves.length) {
    //     console.log(`Moves: ${moves.length} / Unique Moves: ${uniqueMoves.length}`);
    // }
    await Promise.all(uniqueMoves.map(async (move) => {
        const foundBoardState: BoardMoveHistoryDbEntry = await collection.findOne({
            board: move.board,
            move: move.move,
        });

        if (foundBoardState) {
            await collection.updateOne({
                _id: foundBoardState._id,
            }, {
                $set: {
                    ...(winner === move.player && {wins: foundBoardState.wins + 1}),
                    ...(winner !== move.player && {losses: foundBoardState.losses + 1}),
                }
            });
        } else {
            const boardState: BoardMoveHistoryDbEntry = {
                board: move.board,
                move: move.move,
                roll: move.roll,
                wins: winner === move.player ? 1 : 0,
                losses: winner !== move.player ? 1 : 0,
            };

            await collection.insertOne(boardState);
        }
    }));
}

export async function getMoveHistory(board: BoardState, roll: RollResult): Promise<BoardMoveHistoryDbEntry[]> {
    return (await collection.find({
        board: generateNotation(board),
        roll,
    })).toArray();
}

export async function disconnect(): Promise<void> {
    await client.close();
}