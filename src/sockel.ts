import WebSocket from "isomorphic-ws";

export interface Message<T extends object = object> {
    type: string;
    data: T;
}

export default class Sockel {
    protected socket: WebSocket;
    constructor(ws: WebSocket) {
        this.socket = ws;
    }

    public send(message: Message): void {
        this.socket.send(JSON.stringify(message));
    }

    public close(code?: number, data?: string) {
        this.socket.close(code, data);
    }
}
