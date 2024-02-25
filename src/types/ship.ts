export interface IShip {
    position: ICoordinate;
    direction: boolean;
    length: number;
    lengthForStatus: number;
    type: ShipType;
}

export interface ICoordinate {
    x: number;
    y: number;
    status?: StatusType;
}

type ShipType = "small" | "medium" | "large" | "huge";
export type StatusType = "miss" | "killed" | "shot";
