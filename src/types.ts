export enum Player {
    WHITE = "W",
    BLACK = "B",
}

export const NO_PLAYER = "-";
export type NoPlayer = "-";

export type TileState = Player | NoPlayer;

export enum SpecialBoardPos {
    NOT_PLAYED = "NOT_PLAYED",
    SCORED = "SCORED",
}

export type OnBoardPos = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;

export type BoardPos = OnBoardPos | SpecialBoardPos;

export type RollResult = 0 | 1 | 2 | 3 | 4;

export interface BoardState {
    tiles: TileState[];
    whiteScored: number;
    blackScored: number;
    whiteUnplayed: number;
    blackUnplayed: number;
    player: Player;
    notation?: string;
}

export interface Move {
    fromTile: BoardPos;
    toTile: BoardPos;
}

export type Path = BoardPos[];

export type Strategy = (board: BoardState, possibleMoves: Move[], roll: RollResult) => Promise<Move>;

export type MultiStrategy = (board: BoardState, possibleMoves: Move[], roll: RollResult) => Promise<Move[]>;

export interface BoardMoveHistory {
    board: string;
    player: Player;
    move: Move;
    roll: RollResult;
}

export interface BoardMoveHistoryDbEntry {
    _id?: string;
    board: string;
    move: Move;
    wins: number;
    losses: number;
    roll: RollResult;
}