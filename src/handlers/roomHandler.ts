import * as ws from "ws";

import { rooms, users, roomUsers, games, wsList, roomCreators } from "../db/db";
import { IResponse } from "../types/response";
import { IRoom } from "../types/room";
import { IUser, IRoomCreator } from "../types/user";
import { UUID } from "crypto";
import { IGame } from "../types/game";

class RoomHandler {
    private room: IRoom = {
        roomUsers: [],
    };
    private response: IResponse = {
        type: "update_room",
    };
    private user: IUser = {};

    createRoom = (webSocket: ws.WebSocket) => {
        this.room = {
            roomUsers: [],
        };

        this.room.roomId = crypto.randomUUID();

        const currentUser = users.find((user) => user.ws === webSocket);

        if (currentUser) {
            this.room.roomUsers.push(currentUser);

            const roomCreator: IRoomCreator = {
                roomId: this.room.roomId,
                userId: currentUser.index,
                ws: webSocket,
            };

            roomCreators.push(roomCreator);
        }

        rooms.push(this.room);

        this.user.ws = webSocket;
        roomUsers.push(this.user);

        this.response.data = JSON.stringify(this.createUpdateRoomResponse());
    };

    updateRoom = (_webSocket: ws.WebSocket) => {
        this.response.type = "update_room";
        this.response.data = JSON.stringify(this.createUpdateRoomResponse());

        wsList.forEach((client) => client.send(JSON.stringify(this.response)));

        return;
    };

    addUserToRoom = (webSocket: ws.WebSocket, clientData: Record<string, any>) => {
        const user = users.find((user) => user.ws === webSocket);

        const { indexRoom: roomId } = JSON.parse(clientData.toString());

        const roomCreator = roomCreators.find((creator) => creator.roomId === roomId);

        if (user && !this.isInTheRoom(user?.name, roomId)) {
            const requiredRoom = rooms.find((room) => room.roomId === roomId);
            if (requiredRoom && roomCreator?.ws && requiredRoom.roomUsers.length === 1) {
                requiredRoom.roomUsers.push(user);
                this.room = requiredRoom;

                this.updateRoom(webSocket);
                this.createGame(webSocket, roomId, user?.index, false);
                this.createGame(webSocket, roomId, user?.index, true);

                rooms.find((room) => room.roomId === user.index);
            }

            const indexOfCompletedRoom = rooms.findIndex((room) => room.roomUsers.length === 2);
            rooms.splice(indexOfCompletedRoom, 1);
        }
    };

    private createGame = (
        webSocket: ws.WebSocket,
        roomId: UUID,
        userId: UUID | undefined,
        isSecond: boolean,
    ) => {
        this.response.type = "create_game";
        if (!isSecond) {
            const game: IGame = {
                idPlayer: userId,
                idGame: crypto.randomUUID(),
            };

            game.idPlayer = userId;
            game.idGame = crypto.randomUUID();

            games.push(game);

            this.response.data = this.createGameResponse(game);
            webSocket.send(JSON.stringify(this.response));
        } else {
            const existingGame = games.find((game) => game.idPlayer === userId);
            if (existingGame) {
                const roomCreator = roomCreators.find((roomCreator) => roomCreator.roomId === roomId);

                existingGame.idPlayer = roomCreator?.userId;
                this.response.data = this.createGameResponse(existingGame);
                const secondPlayer = roomCreator?.ws;

                secondPlayer?.send(JSON.stringify(this.response));
            }
        }
    };

    private createGameResponse = (game: IGame) => {
        const responseData: Record<string, any> = { ...game };

        return JSON.stringify(responseData);
    };

    private isInTheRoom = (userName: string | undefined, roomId: string) => {
        const room = rooms.find((room) => room.roomId === roomId);
        return room?.roomUsers.find((user) => user.name === userName);
    };

    private createUpdateRoomResponse = () => {
        const responseData: Record<string, any>[] = [];
        for (const room of rooms) {
            const roomForResponse: IRoom = {
                roomId: room.roomId,
                roomUsers: this.getUsers(room),
            };
            responseData.push(roomForResponse);
        }
        return responseData;
    };

    private getUsers = (room: IRoom) => {
        return room.roomUsers.map((user) => ({ name: user.name, index: user.index }));
    };
}

export default new RoomHandler();
