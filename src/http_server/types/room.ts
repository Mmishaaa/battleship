import { IUser } from "./user";
import crypto from "crypto";

export interface IRoom {
    roomId?: crypto.UUID;
    roomUsers: IUser[];
}
