import WebSocket from "isomorphic-ws";
import { Message, Sockel } from "./sockel";
import * as http from "http";

type OnMessageCallback = (data: any, ws: Sockel) => void;

export class Client extends Sockel {
    constructor(url: string, protocols?: string | string[], options?: WebSocket.ClientOptions) {
        super(new WebSocket(url, protocols, options));

        this.socket.on("message", (message: Buffer) => {
            const parsedMessage = JSON.parse(message.toString()) as Message;

            if (!parsedMessage.type || !parsedMessage.data) {
                console.error("Can't call function for message with wrong format");
            }

            this.onMessageHandlers[parsedMessage.type].forEach((cb) => {
                cb(parsedMessage.data, this);
            });
        });

        this.onmessage("IS_CONNECTED", () => {
            console.log("Succesfully connected");
        });
    }

    /**
     * A list of callbacks which only get called if the message type of a websocket message matches a key in the object
     */
    protected onMessageHandlers: {
        [key: string]: OnMessageCallback[];
    } = {};

    public onmessage<messageType extends Message>(
        type: messageType["type"],
        cb: (data: messageType["data"], ws: Sockel) => void
    ): void {
        if (!this.onMessageHandlers[type]) {
            this.onMessageHandlers[type] = [];
        }

        this.onMessageHandlers[type].push(cb);
    }

    public onclose(listener: (this: WebSocket, code: number, reason: string) => void): void {
        this.socket.on("close", listener);
    }

    public onerror(listener: (this: WebSocket, err: Error) => void) {
        this.socket.on("error", listener);
    }

    public onupgrade(listener: (this: WebSocket, request: http.IncomingMessage) => void) {
        this.socket.on("upgrade", listener);
    }
    public onopen(listener: (this: WebSocket) => void) {
        this.socket.on("open", listener);
    }

    public onpong(listener: (this: WebSocket, data: Buffer) => void) {
        this.socket.on("poing", listener);
    }
    public onunexpectedresponse(
        listener: (this: WebSocket, request: http.ClientRequest, response: http.IncomingMessage) => void
    ) {
        this.socket.on("unexpected-response", listener);
    }
}
