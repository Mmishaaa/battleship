import { users, gamesInfo, games, winners } from "../db/db";
import { IResponse } from "../types/response";
import * as ws from "ws";
import { IShip, ICoordinate, StatusType } from "../types/ship";
import { UUID } from "crypto";
import { IUser } from "../types/user";
import { IGameStart } from "../types/game";
import registartionRequestHandler from "../handlers/registartionRequestHandler";

class GameHandler {
    private response: IResponse = {
        type: "start_game",
        id: 0,
    };

    private turnResponse: IResponse = {
        type: "turn",
        id: 0,
    };

    private finishResponse: IResponse = {
        type: "finish",
        id: 0,
    };

    private isSecondPlayer: boolean = false;

    private firstPlayer: IUser = {};

    private secondPlayer: IUser = {};

    private isFirstAttack = true;

    private turnPlayer: IUser = {};

    private killedShipsByFirstPlayer: ICoordinate[] = [];

    private usedCellsByFirstPlayer: ICoordinate[] = [];

    private killedShipsBySecondPlayer: ICoordinate[] = [];

    private usedCellsBySecondPlayer: ICoordinate[] = [];

    startGame = (clientRequestData: Record<string, any>) => {
        this.response.type = "start_game";
        const { gameId, ships, indexPlayer: currentPlayerIndex } = JSON.parse(clientRequestData.toString());

        if (!this.isSecondPlayer) {
            const tempPlayer = users.find((user) => user.index === currentPlayerIndex);
            if (tempPlayer) this.firstPlayer = { ...tempPlayer };

            gamesInfo.push({ idGame: gameId, ships, currentPlayerIndex });

            this.response.data = JSON.stringify(this.createStartGameResponse(ships, currentPlayerIndex));
            this.isSecondPlayer = true;
            return;
        }

        this.firstPlayer?.ws?.send(JSON.stringify(this.response));

        const secondPlayer = users.find((user) => user.index === currentPlayerIndex);
        this.response.data = JSON.stringify(this.createStartGameResponse(ships, currentPlayerIndex));
        secondPlayer?.ws?.send(JSON.stringify(this.response));
        this.isSecondPlayer = false;

        gamesInfo.push({ idGame: gameId, ships, currentPlayerIndex });

        this.turnPlayer = { ...secondPlayer };
        this.changeTurn(this.firstPlayer.ws, secondPlayer?.index);
    };

    turn = (nextPlayerId?: UUID) => {
        this.turnPlayer.index = nextPlayerId;
        this.turnResponse.data = JSON.stringify(this.createTurnResponse(nextPlayerId));
    };

    attack = (webSocket: ws.WebSocket, clientRequestData: Record<string, any>) => {
        const { indexPlayer } = JSON.parse(clientRequestData.toString());

        if (this.turnPlayer.index === indexPlayer) {
            this.response.data = JSON.stringify(this.createAttackResponse(webSocket, clientRequestData));
            webSocket.send(JSON.stringify(this.response));
        }

        if (this.killedShipsByFirstPlayer.length === 30) this.finish(webSocket, this.firstPlayer.index);
        if (this.killedShipsBySecondPlayer.length === 30) this.finish(webSocket, this.secondPlayer.index);
    };

    createAttackResponse = (webSocket: ws.WebSocket, clientRequestData: Record<string, any>) => {
        this.response.type = "attack";
        let { gameId, x, y, indexPlayer } = JSON.parse(clientRequestData.toString());

        if (!x && !y && x !== 0 && y !== 0) {
            x = Math.floor(Math.random() * 10);
            y = Math.floor(Math.random() * 10);
        }

        const gameInfo = gamesInfo.filter((user) => user.idGame === gameId); // idGame, ships, userIndex
        const firstPlayer = gameInfo[1];
        const secondPlayer = gameInfo[0];

        if (this.isFirstAttack) {
            secondPlayer?.ships.forEach((ship) => (ship.lengthForStatus = ship.length));
            firstPlayer?.ships.forEach((ship) => (ship.lengthForStatus = ship.length));
            this.isFirstAttack = false;
        }
        const response = this.sendAttackResponse({ x, y }, webSocket, indexPlayer, firstPlayer, secondPlayer);
        this.firstPlayer.index = firstPlayer?.currentPlayerIndex;
        this.secondPlayer.index = secondPlayer?.currentPlayerIndex;
        return response;
    };

    private finish = (webSocket: ws.WebSocket, winnerId?: UUID) => {
        this.finishResponse.data = JSON.stringify(this.createFinishResponse(winnerId));

        const firstPlayer = users.find((user) => user.index === this.firstPlayer.index);
        const secondPlayer = users.find((user) => user.index === this.secondPlayer.index);

        firstPlayer?.ws?.send(JSON.stringify(this.finishResponse));
        secondPlayer?.ws?.send(JSON.stringify(this.finishResponse));

        this.killedShipsByFirstPlayer = [];
        this.killedShipsBySecondPlayer = [];

        let isNewWinner = true;
        winners.forEach((winner) => {
            if (winner.name === firstPlayer?.name) {
                winner.wins += 1;
                isNewWinner = false;
            }
        });

        if (isNewWinner) winners.push({ name: firstPlayer?.name, wins: 1 });

        registartionRequestHandler.updateWinners(webSocket);
        this.finishGame();
    };

    private finishGame = () => {
        this.isSecondPlayer = false;

        this.firstPlayer = {};

        this.secondPlayer = {};

        this.isFirstAttack = true;

        this.turnPlayer = {};

        this.killedShipsByFirstPlayer = [];

        this.usedCellsByFirstPlayer = [];

        this.killedShipsBySecondPlayer = [];

        this.usedCellsBySecondPlayer = [];
    };

    private createFinishResponse = (winnerId?: UUID) => {
        let responseData = {
            winPlayer: winnerId,
        };
        return responseData;
    };

    private sendAttackResponseWithStatus = (
        { x, y }: ICoordinate,
        indexPlayer?: UUID,
        status?: StatusType,
    ) => {
        return {
            position: { x, y },
            currentPlayer: indexPlayer,
            status,
        };
    };

    private sendAttackResponse = (
        { x, y }: ICoordinate,
        webSocket?: ws.WebSocket,
        indexPlayer?: UUID,
        firstPlayer?: IGameStart,
        secondPlayer?: IGameStart,
    ) => {
        // console.log(this.getAttackStatus(webSocket, firstPlayer, secondPlayer, { x, y }, indexPlayer));
        return {
            position: { x, y },
            currentPlayer: indexPlayer,
            status: this.getAttackStatus(webSocket, firstPlayer, secondPlayer, { x, y }, indexPlayer),
        };
    };

    private getAttackStatus = (
        webSocket?: ws.WebSocket,
        firstPlayer?: IGameStart,
        secondPlayer?: IGameStart,
        position?: ICoordinate,
        userTurnIndex?: UUID,
    ) => {
        let currentPlayerShips: IShip[] = [];
        let status;
        if (userTurnIndex === firstPlayer?.currentPlayerIndex) {
            currentPlayerShips = secondPlayer?.ships || [];
            status = this.performAttack(
                currentPlayerShips,
                true,
                webSocket,
                position,
                firstPlayer,
                secondPlayer,
            );
        } else {
            currentPlayerShips = firstPlayer?.ships || [];
            status = this.performAttack(
                currentPlayerShips,
                false,
                webSocket,
                position,
                secondPlayer,
                firstPlayer,
            );
        }
        return status;
    };

    private performAttack = (
        currentPlayerShips: IShip[],
        isFirstPlayerUse: boolean,
        webSocket?: ws.WebSocket,
        position?: ICoordinate,
        firstPlayer?: IGameStart,
        secondPlayer?: IGameStart,
    ) => {
        let isHit = false;
        let currentPlayerUsedCells: ICoordinate[] = [];
        let currentPlayerKilledCells: ICoordinate[] = [];
        if (isFirstPlayerUse) {
            currentPlayerUsedCells = this.usedCellsByFirstPlayer;
            currentPlayerKilledCells = this.killedShipsByFirstPlayer;
        } else {
            currentPlayerKilledCells = this.killedShipsBySecondPlayer;
            currentPlayerUsedCells = this.usedCellsBySecondPlayer;
        }

        for (const ship of currentPlayerShips || []) {
            const shipStartX = ship.position.x;
            const shipEndX = ship.position.x + (ship.direction ? 0 : ship.length - 1);
            const shipStartY = ship.position.y;
            const shipEndY = ship.position.y + (ship.direction ? ship.length - 1 : 0);

            const currentCell = currentPlayerUsedCells.find(
                (cell) => cell.x === position.x && cell.y === position.y,
            );
            if (currentCell) return currentCell.status;
            if (
                position.x >= shipStartX &&
                position.x <= shipEndX &&
                position.y >= shipStartY &&
                position.y <= shipEndY
            ) {
                ship.lengthForStatus -= 1;
                if (ship.lengthForStatus === 0) {
                    currentPlayerUsedCells.unshift({ x: position.x, y: position.y, status: "killed" });
                    currentPlayerKilledCells.push({ x: position.x, y: position.y, status: "killed" });
                    this.completeCellsAroundKilledShip(
                        ship,
                        isFirstPlayerUse,
                        webSocket,
                        firstPlayer?.currentPlayerIndex,
                        secondPlayer?.currentPlayerIndex,
                    );
                    this.changeTurn(webSocket, firstPlayer?.currentPlayerIndex);
                    return "killed";
                } else {
                    isHit = true;
                }
            }
        }

        if (isHit) {
            currentPlayerUsedCells.unshift({ x: position.x, y: position.y, status: "shot" });
            this.sendAttackResultToSecondUser(
                { x: position.x, y: position.y },
                "shot",
                firstPlayer?.currentPlayerIndex,
                secondPlayer?.currentPlayerIndex,
            );
            this.changeTurn(webSocket, firstPlayer?.currentPlayerIndex);
            return "shot";
        } else {
            currentPlayerUsedCells.unshift({ x: position.x, y: position.y, status: "miss" });
            this.sendAttackResultToSecondUser(
                { x: position.x, y: position.y },
                "miss",
                firstPlayer?.currentPlayerIndex,
                secondPlayer?.currentPlayerIndex,
            );

            if (isFirstPlayerUse) {
                this.killedShipsByFirstPlayer = currentPlayerKilledCells;
                this.usedCellsByFirstPlayer = currentPlayerUsedCells;
            } else {
                this.killedShipsBySecondPlayer = currentPlayerKilledCells;
                this.usedCellsBySecondPlayer = currentPlayerUsedCells;
            }
            this.changeTurn(webSocket, secondPlayer?.currentPlayerIndex);
            return "miss";
        }
    };

    private changeTurn = (webSocket?: ws.WebSocket, indexPlayer?: UUID) => {
        this.turn(indexPlayer);
        const userTurn = users.find((user) => user.index === indexPlayer);

        webSocket?.send(JSON.stringify(this.turnResponse));
        userTurn?.ws?.send(JSON.stringify(this.turnResponse));
        this.turnPlayer.index = userTurn?.index;
    };

    private sendAttackResultToSecondUser = (
        cell: ICoordinate,
        status: StatusType,
        firstPlayerIndex?: UUID,
        secondPlayerIndex?: UUID,
    ) => {
        const secondUser = users.find((user) => user.index === secondPlayerIndex);

        const response = this.sendAttackResponseWithStatus(cell, firstPlayerIndex, status);
        this.response.data = JSON.stringify(response);
        secondUser?.ws?.send(JSON.stringify(this.response));
    };

    private completeCellsAroundKilledShip(
        ship: IShip,
        isFirstPlayerUse: boolean,
        webSocket?: ws.WebSocket,
        firstPlayerIndex?: UUID,
        secondPlayerIndex?: UUID,
    ) {
        let adjacentCells: ICoordinate[] = [];

        adjacentCells = this.completeShipCells(ship, isFirstPlayerUse);

        const responses: any[] = [];
        const processedCells: ICoordinate[] = [];

        adjacentCells.forEach((cell) => {
            const response = this.sendAttackResponseWithStatus(cell, firstPlayerIndex, "miss");
            responses.push(response);
            processedCells.push(cell);
        });

        this.killedShipsByFirstPlayer.forEach((cell) => {
            if (!processedCells.some((processedCell) => this.areCoordinatesEqual(processedCell, cell))) {
                const response = this.sendAttackResponseWithStatus(
                    cell,
                    isFirstPlayerUse ? firstPlayerIndex : secondPlayerIndex,
                    "killed",
                );
                responses.push(response);
                processedCells.push(cell);
            }
        });

        this.killedShipsBySecondPlayer.forEach((cell) => {
            if (!processedCells.some((processedCell) => this.areCoordinatesEqual(processedCell, cell))) {
                const response = this.sendAttackResponseWithStatus(
                    cell,
                    isFirstPlayerUse ? secondPlayerIndex : firstPlayerIndex,
                    "killed",
                );
                responses.push(response);
                processedCells.push(cell);
            }
        });

        responses.forEach((response) => {
            this.response.data = JSON.stringify(response);
            webSocket?.send(JSON.stringify(this.response));

            // console.log(this.response.data);

            const secondUser = users.find((user) => user.index === secondPlayerIndex);
            secondUser?.ws?.send(JSON.stringify(this.response));
        });
    }

    private areCoordinatesEqual(coord1: ICoordinate, coord2: ICoordinate): boolean {
        return coord1.x === coord2.x && coord1.y === coord2.y;
    }

    private completeShipCells = (ship: IShip, isFirstPlayerUse: boolean) => {
        const shipStartX = ship.position.x;
        const shipEndX = ship.position.x + (ship.direction ? 0 : ship.length - 1);
        const shipStartY = ship.position.y;
        const shipEndY = ship.position.y + (ship.direction ? ship.length - 1 : 0);
        const adjacentCells: Array<ICoordinate> = [];

        for (let x = shipStartX - 1; x <= shipEndX + 1; x++) {
            if (x > 9 || x < 0) {
                continue;
            }
            for (let y = shipStartY - 1; y <= shipEndY + 1; y++) {
                if (y < 0 || y > 9) {
                    continue;
                }
                if (x >= shipStartX && x <= shipEndX && y >= shipStartY && y <= shipEndY) {
                    this.writeUsedCells(isFirstPlayerUse, { x, y }, "killed");
                    this.writeKilledShips(isFirstPlayerUse, { x, y, status: "killed" });
                    continue;
                }

                adjacentCells.push({ x, y });
                this.writeUsedCells(isFirstPlayerUse, { x, y }, "miss");
            }
        }
        return adjacentCells;
    };

    private writeUsedCells = (isFirstPlayerUse: boolean, cell: ICoordinate, status: StatusType) => {
        if (isFirstPlayerUse) {
            this.usedCellsByFirstPlayer.unshift({ x: cell.x, y: cell.y, status: status });
        } else {
            this.usedCellsBySecondPlayer.unshift({ x: cell.x, y: cell.y, status: status });
        }
    };

    private writeKilledShips = (isFirstPlayerUse: boolean, cell: ICoordinate) => {
        if (isFirstPlayerUse) {
            this.killedShipsByFirstPlayer.push({ x: cell.x, y: cell.y, status: "killed" });
        } else {
            this.killedShipsBySecondPlayer.push({ x: cell.x, y: cell.y, status: "killed" });
        }
    };

    private createTurnResponse = (currentPlayerId?: UUID) => {
        const responseData: Record<string, any> = {};
        responseData.currentPlayer = currentPlayerId;

        return responseData;
    };

    private createStartGameResponse = (ships: IShip[], currentPlayerIndex: UUID) => {
        const responseData: Record<string, any> = {};
        ships.forEach((ship) => JSON.stringify(ship));

        responseData.ships = ships;
        responseData.currentPlayerIndex = currentPlayerIndex;

        return responseData;
    };
}

export default new GameHandler();
