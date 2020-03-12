import WebSocket from "isomorphic-ws";
import { IsConnectedMessage, Message, WebSockel } from "./webSockel";

type OnMessageCallback = (data: any, ws: WebSockel) => void;

export class SockelClient extends WebSockel {
    /**
     * A list of callbacks which only get called if the message type of a websocket message matches a key in the object
     */
    protected onMessageHandlers: {
        [key: string]: OnMessageCallback[];
    } = {};
    /**
     * An internal state which gets set to true when the server send an "IsConnectedMessage" to a client instance
     */
    private isConnected = false;
    private messagesSentBeforeConnected: Message[] = [];

    public constructor(url: string, protocols?: string | string[], options?: WebSocket.ClientOptions) {
        super(new WebSocket(url, protocols, options));

        this.socket.onmessage = (message: WebSocket.MessageEvent) => {
            const internalMessage = WebSockel.parseAsInternalMessage(message.data.toString());

            const publicMessage: Message = { type: internalMessage.type, data: internalMessage.data };

            this.onMessageHandlers[publicMessage.type].forEach((cb) => {
                cb(publicMessage.data, this);
            });
        };

        this.onmessage<IsConnectedMessage>("IS_CONNECTED", () => {
            this.isConnected = true;
            this.messagesSentBeforeConnected.forEach((message: Message) => {
                this.send(message);
            });

            this.messagesSentBeforeConnected = [];

            this.onconnection();
        });
    }

    public static async open(
        url: string,
        protocols?: string | string[],
        options?: WebSocket.ClientOptions
    ): Promise<SockelClient> {
        const client = new this(url, protocols, options);

        return await new Promise(async (resolve, reject) => {
            client.onmessage<IsConnectedMessage>("IS_CONNECTED", () => {
                resolve(client);
            });

            await new Promise(() => {
                setTimeout(() => {
                    return reject(Error("Timeout while connecting to server"));
                }, 2000);
            });
        });
    }

    /**
     * Wrapper for the underlying Websockel send
     * If the client isn't connected while calling this function, all the messages will be set into a queue and will
     * be send as soon as possible when connected successfully
     *
     * @param message
     */
    public send<TMessage extends Message>(message: TMessage) {
        if (this.isConnected) {
            super.send(message);
        } else {
            this.messagesSentBeforeConnected.push(message);
        }
    }

    /**
     * Wrapper for the underlying Websockel send
     * If the client isn't connected while calling this function, all the messages will be set into a queue and will
     * be send as soon as possible when connected successfully
     *
     * @param message
     */
    public async request<TMessage extends Message>(message: Message): Promise<TMessage> {
        return await new Promise<TMessage>(async (resolve, reject) => {
            const sendMessage = super.send(message);

            if (!sendMessage) {
                return;
            }

            this.onmessage(`RESPONSE_${sendMessage.metaData.messageId}`, (data: TMessage) => {
                return resolve(data);
            });

            await new Promise(() => {
                setTimeout(() => {
                    return reject(Error("Timeout while connecting to server"));
                }, 5000);
            });
        });
    }

    public onmessage(type: string, cb: (data: any, ws: WebSockel) => void): void;
    public onmessage<TMessage extends Message>(
        type: TMessage["type"],
        cb: (data: TMessage["data"], ws: WebSockel) => void
    ): void;
    public onmessage<T extends Message>(type: T["type"], cb: (data: T, ws: WebSockel) => void): void {
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
    public onopen(cb: () => void) {
        this.onconnection = cb;
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

    private onconnection: () => void = () => {};
}
