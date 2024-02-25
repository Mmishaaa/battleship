import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

import wss from "../wsServer/wss";
import { parseRequest } from "../utils/parseRequest";
import router from "../router/router";
import { wsList } from "../db/db";

export const httpServer = http.createServer(function (req, res) {
    const __dirname = path.resolve(path.dirname(''));
    const file_path = __dirname + (req.url === '/' ? '/front/index.html' : '/front' + req.url);
    fs.readFile(file_path, function (err, data) {
        if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
        }
        res.writeHead(200);
        res.end(data);
    });
});

wss.on("connection", (ws) => {
    console.log("connected");
    ws.on("error", console.error);

    ws.on("message", (data) => {
        const parsedData = parseRequest(data);
        // console.log(parsedData)
        router(ws, parsedData);
    });

    ws.on("close", () => {
        const indexOfDisconnectedSocket = Array.from(wsList).findIndex((socket) => socket.ws === ws);
        Array.from(wsList).splice(indexOfDisconnectedSocket, 1);
        // console.log("listOfConnectedUsers: " + listOfConnectedUsers);
        console.log("disconnected");
    });
});