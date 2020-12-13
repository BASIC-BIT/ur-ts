import {
    BoardMoveHistory,
    BoardPos,
    BoardState, Move,
    NO_PLAYER,
    OnBoardPos,
    Path,
    Player,
    RollResult,
    SpecialBoardPos, Strategy,
    TileState
} from "./types";
import {addGame} from "./moveDatabase";
import {CONFIG} from "./config";

const DEBUG = CONFIG.DEBUG;

const WHITE_PATH: Path = [SpecialBoardPos.NOT_PLAYED, 17, 16, 15, 14, 6, 7, 8, 9, 10, 11, 12, 13, 19, 18, SpecialBoardPos.SCORED];
const BLACK_PATH: Path = [SpecialBoardPos.NOT_PLAYED, 3, 2, 1, 0, 6, 7, 8, 9, 10, 11, 12, 13, 5, 4, SpecialBoardPos.SCORED];

export const SAFE_TILES: OnBoardPos[] = [0, 1, 2, 3, 4, 5, 14, 15, 16, 17, 18, 19];

const ROSETTES: OnBoardPos[] = [0, 14, 9, 4, 18];

const PIECES_PER_PLAYER: number = 5;

function getNewBoard(): BoardState {
    return {
        tiles: [...new Array(20)].map(() => "-"),
        whiteScored: 0,
        blackScored: 0,
        whiteUnplayed: PIECES_PER_PLAYER,
        blackUnplayed: PIECES_PER_PLAYER,
        player: Player.WHITE,
    }
}

export function printBoard(board: BoardState) {
    debugLog(() => `${printTile(0, board.tiles[0])}${printTile(1, board.tiles[1])}${printTile(2, board.tiles[2])}${printTile(3, board.tiles[3])}      ${printTile(4, board.tiles[4])}${printTile(5, board.tiles[5])}\n` +
        `${printTile(6, board.tiles[6])}${printTile(7, board.tiles[7])}${printTile(8, board.tiles[8])}${printTile(9, board.tiles[9])}${printTile(10, board.tiles[10])}${printTile(11, board.tiles[11])}${printTile(12, board.tiles[12])}${printTile(13, board.tiles[13])}\n` +
        `${printTile(14, board.tiles[14])}${printTile(15, board.tiles[15])}${printTile(16, board.tiles[16])}${printTile(17, board.tiles[17])}      ${printTile(18, board.tiles[18])}${printTile(19, board.tiles[19])}\n` +
        `White Scored / Unplayed: ${board.whiteScored} / ${board.whiteUnplayed}\n` +
        `Black Scored / Unplayed: ${board.blackScored} / ${board.blackUnplayed}\n` +
        `Notation: ${generateNotation(board)}\n`);
}

function printTile(pos: BoardPos, state: TileState) {
    if(state === NO_PLAYER) {
        if(isRosette(pos)) {
            return '[*]'
        }
        return '[ ]';
    }
    if(state === Player.WHITE) {
        return '[W]';
    }
    if(state === Player.BLACK) {
        return '[B]';
    }
}

function roll(): RollResult {
    const result = Math.random();
    if (result < 0.0625) {
        return 0;
    }
    if (result < 0.3125) {
        return 1;
    }
    if (result < 0.6875) {
        return 2;
    }
    if (result < 0.9375) {
        return 3;
    }
    return 4;
}

function getPath(player: Player): Path {
    return player === Player.WHITE ? WHITE_PATH : BLACK_PATH;
}

export function getIndexOnPath(player: Player, tile: OnBoardPos) {
    return getPath(player).indexOf(tile);
}

function getNextTile(player: Player, curTile: BoardPos, moveTiles: number): BoardPos {
    const path = getPath(player);
    const curIndex = curTile === undefined ? -1 : path.indexOf(curTile);
    if(curIndex + moveTiles >= path.length) {
        return undefined; //Too far off the board, invalid
    }
    return path[curIndex + moveTiles];
}

export function isRosette(tile: BoardPos): boolean {
    if(tile === SpecialBoardPos.SCORED || tile === SpecialBoardPos.NOT_PLAYED) {
        return false;
    }

    return ROSETTES.indexOf(tile) !== -1;
}

function canPlayerMoveToTile(board: BoardState, player: Player, tile: BoardPos) {
    if(tile === undefined || tile === SpecialBoardPos.NOT_PLAYED) {
        return false;
    }
    if(tile === SpecialBoardPos.SCORED) {
        return true;
    }

    const tileContents = board.tiles[tile];

    return tileContents === NO_PLAYER || (tileContents !== player && !isRosette(tile));
}

function hasUnplayedPieces(board: BoardState, player: Player) {
    return (player === Player.WHITE && board.whiteUnplayed) || (player === Player.BLACK && board.blackUnplayed)
}

function getAvailableMoves(board: BoardState, roll: RollResult): Move[] {
    if(roll === 0) {
        return [];
    }

    let possibleMoves: Move[] = [];

    if(hasUnplayedPieces(board, board.player)) {
        const unplayedMoveTile = getNextTile(board.player, SpecialBoardPos.NOT_PLAYED, roll);
        if(canPlayerMoveToTile(board, board.player, unplayedMoveTile)) {
            possibleMoves.push({
                fromTile: SpecialBoardPos.NOT_PLAYED,
                toTile: unplayedMoveTile,
            });
        }
    }

    possibleMoves = possibleMoves.concat(board.tiles
        .map((val: TileState, tile: number) => ({ val, tile: tile as BoardPos })) // get index as tile
        .filter(({ val }) => val === board.player) //filter down to only tiles with current player's pieces
        .map(({ tile }) => ({
            tile,
            nextTile: getNextTile(board.player, tile, roll),
        })) //get potential move
        .filter(({ nextTile }) => canPlayerMoveToTile(board, board.player, nextTile)) //ensure it's a valid move
        .map(({ tile, nextTile }) => ({
            fromTile: tile,
            toTile: nextTile,
        }))); // convert to Move format

    return possibleMoves;
}

function makeMove(board: BoardState, move: Move) { //TODO: this function assumes the move is valid - maybe some validity checking here?
    // If move is putting a piece into play, decrement unplayed counter
    if(move.fromTile === SpecialBoardPos.NOT_PLAYED) {
        if(board.player === Player.WHITE) {
            board.whiteUnplayed--;
        } else {
            board.blackUnplayed--;
        }
    }

    // If move is not putting a piece into play, remove piece from current tile
    if(move.fromTile !== SpecialBoardPos.NOT_PLAYED) {
        board.tiles[move.fromTile] = NO_PLAYER;
    }

    // If target tile is scored, increment scored counter and end
    if(move.toTile === SpecialBoardPos.SCORED) {
        if(board.player === Player.WHITE) {
            board.whiteScored++;
        } else {
            board.blackScored++;
        }

        //Swap players if game is not over
        if(!isWinner(board)) {
            board.player = getOtherPlayer(board.player);
        }

        return;
    }

    // Increment unplayed pieces if target tile previously contained a piece
    const existingPiece = board.tiles[move.toTile];
    if(existingPiece !== NO_PLAYER) {
        if(board.player === Player.WHITE) {
            board.blackUnplayed++;
        } else {
            board.whiteUnplayed++;
        }
    }

    // Move tile to target tile
    board.tiles[move.toTile] = board.player;

    // If target square is not a rosette and game is not over, swap players
    if(!isRosette(move.toTile) && !isWinner(board)) {
        board.player = getOtherPlayer(board.player);
    }
}

function isWinner(board: BoardState): Player | undefined {
    if(board.blackScored === PIECES_PER_PLAYER) {
        return Player.BLACK;
    }
    if(board.whiteScored === PIECES_PER_PLAYER) {
        return Player.WHITE;
    }

    return undefined;
}

export function getOtherPlayer(player: Player): Player {
    return player === Player.WHITE ? Player.BLACK : Player.WHITE;
}


function debugLog(argFunc: () => string) {
    if(DEBUG) {
        console.log(argFunc());
    }
}

//Import/Export notation in docs/notation.txt
function exportBoardState(board: BoardState): string {
    const winner = isWinner(board);
    if(winner) {
        return `${winner}*`;
    }
    return `${board.tiles.join('')}#${board.whiteUnplayed}#${board.whiteScored}#${board.blackUnplayed}#${board.blackScored}#${board.player}`;
}

export function generateNotation(board: BoardState): string {
    if(!board.notation) {
        board.notation = exportBoardState(board);
    }

    return board.notation;
}

function prettyPlayer(player: Player): string {
    return player === Player.WHITE ? "White" : "Black";
}

export async function playGame(whiteStrategy: Strategy, blackStrategy: Strategy): Promise<Player> {
    const moveHistory : BoardMoveHistory[] = [];
    debugLog(() => `------- GAME BEGIN -------`);
    let board = getNewBoard();
    printBoard(board);
    let moveCount = 1;
    while(!isWinner(board)) {
        debugLog(() => `------- MOVE ${moveCount} -------`);

        const curRoll = roll();
        debugLog(() => `${prettyPlayer(board.player)} rolls: ${curRoll}`);

        let possibleMoves = getAvailableMoves(board, curRoll);
        debugLog(() => `Possible moves: ${possibleMoves.length}`);
        if(possibleMoves.length > 0) {
            let move: Move;
            if(possibleMoves.length === 1) {
                move = possibleMoves[0];
            } else {
                move = board.player === Player.WHITE ? await whiteStrategy(board, possibleMoves, curRoll) : await blackStrategy(board, possibleMoves, curRoll);
            }
            moveHistory.push({
                board: generateNotation(board),
                move,
                roll: curRoll,
                player: board.player,
            });
            makeMove(board, move);
        } else {
            board.player = getOtherPlayer(board.player);
        }
        board.notation = null;

        printBoard(board);
        moveCount++;
    }

    debugLog(() => `${prettyPlayer(board.player)} wins!!!`);

    await addGame(moveHistory, board.player);
    return board.player;
}

