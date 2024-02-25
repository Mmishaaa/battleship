export interface IResponse {
    type?: RequestTypes;
    data?: string;
    id?: number;
}

type RequestTypes =
    | "reg"
    | "update_winners"
    | "create_room"
    | "create_game"
    | "start_game"
    | "add_player_to_room"
    | "add_user_to_room"
    | "update_room"
    | "add_ships"
    | "attack"
    | "randomAttack"
    | "finish"
    | "turn";
