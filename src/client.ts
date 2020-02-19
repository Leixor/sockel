import WebSocket from "isomorphic-ws";
import Sockel, { Message } from "./sockel";

type OnMessageCallback = (data: any, ws: Sockel) => void;

export default class Client extends Sockel {
    constructor(url: string, protocols?: string | string[], options?: WebSocket.ClientOptions) {
        super(new WebSocket(url, protocols, options));

        this.socket.onmessage = (message: WebSocket.MessageEvent) => {
            const parsedMessage = JSON.parse(message.data.toString()) as Message;

            if (!parsedMessage.type || !parsedMessage.data) {
                console.error("Can't call function for message with wrong format");
            }

            this.onMessageHandlers[parsedMessage.type].forEach((cb) => {
                cb(parsedMessage.data, this);
            });
        };

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

    /**
     * Passthrough wrapper
     *
     * @param cb
     */
    public onopen(cb: (event: WebSocket.OpenEvent) => void) {
        this.socket.onopen = cb;
    }

    /**
     * Passthrough wrapper
     *
     * @param cb
     */
    public onerror(cb: (event: WebSocket.ErrorEvent) => void) {
        this.socket.onerror = cb;
    }

    /**
     * Passthrough wrapper
     *
     * @param cb
     */
    public onclose(cb: (event: WebSocket.CloseEvent) => void) {
        this.socket.onclose = cb;
    }
}
