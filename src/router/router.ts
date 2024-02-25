import * as ws from "ws";

import registartionRequestController from "../handlers/registartionRequestHandler";
import roomHandler from "../handlers/roomHandler";
// import { games } from "../db/db";
import gameHandler from "../handlers/gameHandler";

const router = (webSocket: ws.WebSocket, clientRequest: Record<string, any>) => {
    const { type: typeOfCommand } = clientRequest;
    switch (typeOfCommand) {
        case "reg":
            registartionRequestController.registrate(webSocket, clientRequest.data);
            roomHandler.updateRoom(webSocket);
            registartionRequestController.updateWinners(webSocket);
            break;
        case "create_room":
            roomHandler.createRoom(webSocket);
            roomHandler.updateRoom(webSocket);
            break;
        case "add_user_to_room":
            roomHandler.addUserToRoom(webSocket, clientRequest.data);
            roomHandler.updateRoom(webSocket); // createRoom here
            break;
        case "add_ships":
            gameHandler.startGame(clientRequest.data);
            // gameHandler.turn();
            break;
        case "attack":
        case "randomAttack":
            gameHandler.attack(webSocket, clientRequest.data);
            break;
        default:
            console.log("Invalid input");
            break;
    }
};

export default router;
