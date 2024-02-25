import * as ws from "ws";

import { IRoom } from "../types/room";
import { IRegUser, IUser, IWinner, IPlayer, IRoomCreator } from "../types/user";
import { IGame, IGameStart } from "../types/game";

export const users: IUser[] = [];

export const regUsers: IRegUser[] = [];

export const wsList: Set<ws.WebSocket> = new Set();

export const winners: IWinner[] = [{ name: "Mikhail", wins: 110101010 }];

export const rooms: IRoom[] = [];

export const roomUsers: IUser[] = [];

export const players: IPlayer[] = [];

export const games: IGame[] = [];

export const roomCreators: IRoomCreator[] = [];

export const gamesInfo: IGameStart[] = [];
