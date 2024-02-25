// import { WebSocketServer } from "ws";
import * as ws from "ws";

const wss = new ws.WebSocketServer({ port: 3000 });

export default wss;
