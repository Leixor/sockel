import WebSocket from "isomorphic-ws";
import { IsConnectedMessage, Message, WebSockel } from "./webSockel";

type OnMessageCallback = (data: any, ws: WebSockel) => void;

/**
 * A webbrowser and node ready implementation of a sockel client
 *
 * Can only be instantiated with its public static [[connect]] function
 */
export class Client extends WebSockel {
    /**
     * A list of callbacks which only get called if the message type of a websocket message matches a key in the object
     */
    protected onMessageHandlers: {
        [key: string]: OnMessageCallback[];
    } = {};

    private constructor(url: string, protocols?: string | string[], options?: WebSocket.ClientOptions) {
        super(new WebSocket(url, protocols, options));

        this.socket.onmessage = (message: WebSocket.MessageEvent) => {
            const internalMessage = WebSockel.parseAsInternalMessage(message.data.toString());

            const publicMessage: Message = { type: internalMessage.type, data: internalMessage.data };

            if (!this.onMessageHandlers[publicMessage.type]) {
                return;
            }

            this.onMessageHandlers[publicMessage.type].forEach((cb) => {
                cb(publicMessage.data, this);
            });
        };
    }

    /**
     * Opens a connection to a sockel server
     * This function is awaitable, as it waits for a response of the websocketServer (not just the open event)
     *
     * @param url
     * @param protocols
     * @param options
     */
    public static async connect(
        url: string,
        protocols?: string | string[],
        options?: WebSocket.ClientOptions
    ): Promise<Client> {
        const client = new this(url, protocols, options);

        return await new Promise(async (resolve, reject) => {
            client.onmessage<IsConnectedMessage>("IS_CONNECTED", () => {
                return resolve(client);
            });

            await new Promise(() => {
                setTimeout(() => {
                    return reject(Error("Timeout while connecting to websocketServer"));
                }, 2000);
            });
        });
    }

    /**
     * A synchronous alternative to the send function. You can await this call of a message sending to expect
     * a message as a response from the websocketServer
     *
     * @param message
     * @param timeout
     */
    public async request<TMessage extends Message>(message: Message, timeout: number = 2000): Promise<TMessage> {
        return await new Promise<TMessage>(async (resolve, reject) => {
            message.waitingForResponse = true;

            const sentMessage = super.send(message);

            if (!sentMessage) {
                return;
            }

            this.onmessage(`RESPONSE_${sentMessage.metaData.messageId}`, (responseMessage: TMessage) => {
                return resolve(responseMessage);
            });

            if (timeout > 0) {
                await new Promise(() => {
                    setTimeout(() => {
                        return reject("Timeout while waiting for a response from the websocketServer");
                    }, timeout);
                });
            }
        });
    }

    /**
     * Defines a callback for when the client receives a message with the given type from this methods parameter
     * Can be given an interface as a generic argument, so the data is typed when using it in the callback
     *
     * @param type Defines on which message type the callback should be executed
     * @param cb
     */
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
