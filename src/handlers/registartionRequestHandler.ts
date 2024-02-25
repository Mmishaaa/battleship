import * as ws from "ws";

import { users, wsList, regUsers, winners } from "../db/db";
import { IResponse } from "../types/response";
import { IUser, IRegUser, IIndexUser, IWinner } from "../types/user";

class RegistrationHandler {
    private response: IResponse = {
        // type: "reg",
    };

    private indexOfUsers: IIndexUser[] = [];

    registrate = (ws: ws.WebSocket, registartionData: Record<string, any>) => {
        const { name, password } = JSON.parse(registartionData.toString());

        this.response.type = "reg";

        let regUser: IRegUser = {
            name,
            password,
        };

        const user = {
            ws: ws,
            name: name,
            index: crypto.randomUUID(),
        };

        this.indexOfUsers.push(user);

        if (!this.isRegistrated(name)) {
            regUsers.push(regUser);
            users.push(user);
            wsList.add(ws);

            const responseData = this.createSuccessfullRegistrationResponse(user);
            this.response.data = JSON.stringify(responseData);
            ws.send(JSON.stringify(this.response));
            return;
        }
        if (this.isLoggedIn(regUser)) {
            const correspondingUser = this.indexOfUsers.find((user) => user.name === regUser.name);

            regUser = {
                ...correspondingUser,
                password: password,
            };
            this.response.data = JSON.stringify(this.createSuccessfullRegistrationResponse(regUser));
            ws.send(JSON.stringify(this.response));
            return;
        }

        const correspondingUser = this.indexOfUsers.find((user) => user.name === regUser.name);

        regUser = {
            ...correspondingUser,
            password: password,
        };

        this.response.data = JSON.stringify(this.createErrorResponse(regUser));
        ws.send(JSON.stringify(this.response));
        return;
    };

    updateWinners = (ws: ws.WebSocket) => {
        this.response.type = "update_winners";
        this.response.data = JSON.stringify(this.createWinnersResponse());
        ws.send(JSON.stringify(this.response));
        wsList.forEach((client: ws.WebSocket) => client.send(JSON.stringify(this.response)));

        return;
    };

    private createWinnersResponse = () => {
        const responseData: IWinner[] = winners.map((winner) => winner);
        return responseData;
    };

    private createSuccessfullRegistrationResponse = (user: IUser | IRegUser) => {
        const responseData: Record<string, any> = {};
        responseData.name = user.name;
        responseData.index = user.index;
        return responseData;
    };

    private isRegistrated = (userName: string): boolean => {
        if (users.find((user) => user.name === userName)) return true;
        return false;
    };

    private createErrorResponse = (user: IUser | IRegUser): Record<string, any> => {
        const responseData: Record<string, any> = {};
        responseData.name = user.name;
        responseData.index = user.index;
        responseData.error = true;
        responseData.errorText = "ERROR";
        return responseData;
    };

    private isLoggedIn = (registredUser: IRegUser): boolean => {
        if (
            regUsers.find(
                (user) => user.password === registredUser.password && user.name === registredUser.name,
            )
        ) {
            return true;
        }
        return false;
    };
}

export default new RegistrationHandler();
