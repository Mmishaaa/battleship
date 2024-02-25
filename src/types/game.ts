import { UUID } from "crypto";
import { IShip } from "./ship";

export interface IGame {
    idGame?: UUID;
    idPlayer?: UUID;
}

export interface IGameStart {
    idGame: UUID;
    ships: IShip[];
    currentPlayerIndex: UUID;
}
