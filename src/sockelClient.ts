import { Message } from "./sockel";
import WebSocket from "isomorphic-ws";

type OnMessageCallback = (data: any, ws: SockelClient) => void;

export class SockelClient extends WebSocket {
    constructor(url: string, protocols?: string | string[], options?: WebSocket.ClientOptions) {
        super(url, protocols, options);

        this.on("message", (message: Buffer) => {
            const parsedMessage = JSON.parse(message.toString()) as Message;

            if (!parsedMessage.type || !parsedMessage.data) {
                console.error("Can't call function for message with wrong format");
            }

            this.onMessageHandlers[parsedMessage.type].forEach((cb) => {
                cb(parsedMessage.data, this);
            });
        });
    }

    /**
     * A list of callbacks which only get called if the message type of a websocket message matches a key in the object
     */
    protected onMessageHandlers: {
        [key: string]: OnMessageCallback[];
    } = {};

    public send(message: Message): void {
        super.send(JSON.stringify(message));
    }

    public onMessage<messageType extends Message>(
        type: messageType["type"],
        cb: (data: messageType["data"], ws: SockelClient) => void
    ): void {
        if (!this.onMessageHandlers[type]) {
            this.onMessageHandlers[type] = [];
        }

        this.onMessageHandlers[type].push(cb);
    }
}
