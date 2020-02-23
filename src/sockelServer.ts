import WebSocket, { ServerOptions } from "isomorphic-ws";
import * as http from "http";
import uuid from "uuid";
import { IsConnectedMessage, Message, WebSockel } from "./webSockel";

export type User = { id: string | number };

interface ConnectedSockel<TUser extends User> {
    ws: WebSockel;
    user: TUser;
}

type OnMessageCallback<TUser extends User> = (data: any, connectedSockel: ConnectedSockel<TUser>) => void;

export class SockelServer<TUser extends User> {
    /**
     * The internally wrapped Websocket.Server
     */
    protected server: WebSocket.Server;
    /**
     * A list of callbacks which only get called if the message type of a websocket message matches a key in the object
     */
    protected onMessageHandlers: {
        [key: string]: OnMessageCallback<TUser>[];
    } = {};
    /**
     * A full list of all the connected users, grouped by their user id
     */
    protected connectedUsers: Map<TUser["id"], Set<ConnectedSockel<TUser>>> = new Map();

    private constructor(
        extractUserFromRequest: (request: http.IncomingMessage) => Promise<TUser> | TUser,
        options?: ServerOptions,
        cb?: () => void
    ) {
        this.server = new WebSocket.Server(options, cb);

        this.server.on("connection", async (ws, request: http.IncomingMessage) => {
            const user: TUser = await extractUserFromRequest(request);
            const sockel = new WebSockel(ws);

            const connectedUser: ConnectedSockel<TUser> = { ws: sockel, user };

            this.connectedUsers.get(user.id)?.add(connectedUser) ??
                this.connectedUsers.set(user.id, new Set([connectedUser]));

            console.log(`User: ${user.id} connected`);

            ws.on("message", (message: Buffer) => {
                let internalMessage;
                try {
                    internalMessage = WebSockel.parseAsInternalMessage(message.toString());
                } catch (error) {
                    console.log(error);
                    return;
                }

                const publicMessage: Message = { type: internalMessage.type, data: internalMessage.data };

                this.onMessageHandlers[publicMessage.type].forEach((cb) => {
                    cb(publicMessage.data, connectedUser);
                });
            });

            sockel.send<IsConnectedMessage>({ type: "IS_CONNECTED", data: {} });
        });
    }

    /**
     * Passthrough wrapper for websocket close event
     *
     * @param cb
     */
    public close(cb?: (err?: Error) => void) {
        this.server.close(cb);
    }

    /**
     *
     * @param type
     * @param cb
     */
    public onmessage(type: string, cb: (data: any, connectedUser: ConnectedSockel<TUser>) => void): void;
    public onmessage<TMessage extends Message>(
        type: TMessage["type"],
        cb: (data: TMessage["data"], connectedUser: ConnectedSockel<TUser>) => void
    ): void;
    public onmessage<TMessage extends Message>(
        type: TMessage["type"],
        cb: (data: TMessage, connectedUser: ConnectedSockel<TUser>) => void
    ): void {
        if (!this.onMessageHandlers[type]) {
            this.onMessageHandlers[type] = [];
        }

        this.onMessageHandlers[type].push(cb);
    }

    /**
     *
     * @param userId
     * @param message
     */
    public sendToUser<TMessage extends Message>(userId: TUser["id"], message: TMessage) {
        if (!this.connectedUsers.get(userId)) {
            throw new Error(`User with id ${userId} doesn't exist`);
        }

        this.connectedUsers.get(userId)?.forEach((connectedUser) => {
            connectedUser.ws.send(message);
        });
    }

    /**
     *
     */
    public purgeOnMessageCallbacks() {
        this.onMessageHandlers = {};
    }

    /**
     *
     * @param options
     * @param cb
     */
    public static create(
        options?: ServerOptions & {
            extractUserFromRequest?: undefined;
        },
        cb?: () => void
    ): SockelServer<User>;

    public static create<TUser extends User>(
        options: ServerOptions & {
            extractUserFromRequest: (req: http.IncomingMessage) => Promise<TUser> | TUser;
        },
        cb?: () => void
    ): SockelServer<TUser>;

    public static create<TUser extends User>(
        options: ServerOptions & {
            extractUserFromRequest?: undefined | ((req: http.IncomingMessage) => Promise<TUser> | TUser);
        } = {
            extractUserFromRequest: undefined,
        },
        cb?: () => void
    ) {
        if (options.extractUserFromRequest === undefined) {
            return new this((req: http.IncomingMessage) => ({ id: uuid() }), options, cb);
        }
        return new this(options.extractUserFromRequest, options, cb);
    }
}

// public onmessage<TMessage extends object, TMessage extends Message<TMessage>>(
//     type: string,
//     cb: (data: TMessage, connectedUser: ConnectedUser<TUser>) => void
// ): void;
// public onmessage<TMessage extends Message>(
//     type: TMessage["type"],
//     cb: (data: TMessage["data"], connectedUser: ConnectedUser<TUser>) => void
// ): void;
// public onmessage<TMessage extends Message>(
//     type: TMessage["type"],
//     cb: (data: TMessage["data"], connectedUser: ConnectedUser<TUser>) => void
// ): void {
//     if (!this.onMessageHandlers[type]) {
//     this.onMessageHandlers[type] = [];
// }
//
// this.onMessageHandlers[type].push(cb);
// }
