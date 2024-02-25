import * as ws from "ws";
import crypto, { UUID } from "crypto";

export interface IWinner {
    name?: string;
    wins: number;
}

export interface IUser {
    ws?: ws.WebSocket;
    name?: string;
    index?: crypto.UUID;
    error?: boolean;
    errorText?: string;
}

export interface IRegUser {
    name?: string;
    password?: string;
    index?: crypto.UUID;
}

export interface IIndexUser {
    name: string;
    index: crypto.UUID;
}

export interface IPlayer {
    id: UUID;
    idGame: UUID;
}

export interface IRoomCreator {
    roomId: UUID;
    userId?: UUID;
    ws?: ws.WebSocket;
}
