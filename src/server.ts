import WebSocket, { ServerOptions } from "isomorphic-ws";
import * as http from "http";
import uuid from "uuid";
import Sockel, { Message } from "./sockel";

export type User = { id: string };

interface ConnectedUser<CustomUser extends User> {
    ws: Sockel;
    user: CustomUser;
}

type OnMessageCallback<CustomUser extends User> = (data: any, connectedUser: ConnectedUser<CustomUser>) => void;

export default class Server<CustomUser extends User> {
    protected server: WebSocket.Server;
    private constructor(
        extractUserFromRequest: (request: http.IncomingMessage) => CustomUser,
        options?: ServerOptions,
        cb?: () => void
    ) {
        this.server = new WebSocket.Server(options, cb);

        this.server.on("connection", (ws, request: http.IncomingMessage) => {
            const user: CustomUser = extractUserFromRequest(request);

            const connectedUser: ConnectedUser<CustomUser> = { ws: new Sockel(ws), user };

            this.connectedUsers.get(user.id)?.add(connectedUser) ??
                this.connectedUsers.set(user.id, new Set([connectedUser]));

            console.log(`User: ${user.id} connected`);

            ws.on("message", (message: Buffer) => {
                const parsedMessage = JSON.parse(message.toString()) as Message;

                if (!parsedMessage.type || !parsedMessage.data) {
                    console.error("Can't call function for message with wrong format");
                }

                this.onMessageHandlers[parsedMessage.type].forEach((cb) => {
                    cb(parsedMessage.data, connectedUser);
                });
            });

            this.sendToUser(user.id, { type: "IS_CONNECTED", data: {} });
        });
    }

    /**
     * Passthrough wrapper for websocket close event
     * @param cb
     */
    public close(cb?: (err?: Error) => void) {
        this.server.close(cb);
    }

    /**
     * A list of callbacks which only get called if the message type of a websocket message matches a key in the object
     */
    protected onMessageHandlers: {
        [key: string]: OnMessageCallback<CustomUser>[];
    } = {};

    /**
     * A full list of connected users
     */
    protected connectedUsers: Map<string, Set<ConnectedUser<CustomUser>>> = new Map();

    public onmessage<messageType extends Message>(
        type: messageType["type"],
        cb: (data: messageType["data"], connectedUser: ConnectedUser<CustomUser>) => void
    ): void {
        if (!this.onMessageHandlers[type]) {
            this.onMessageHandlers[type] = [];
        }

        this.onMessageHandlers[type].push(cb);
    }

    public sendToUser(userId: string, message: Message) {
        if (!this.connectedUsers.get(userId)) {
            throw new Error("User with this id doesn't exist");
        }

        this.connectedUsers.get(userId)?.forEach((connectedUser) => {
            connectedUser.ws.send(message);
        });
    }

    public purgeOnMessageCallbacks() {
        this.onMessageHandlers = {};
    }

    public static create(
        options?: ServerOptions & {
            extractUserFromRequest?: undefined;
        },
        cb?: () => void
    ): Server<User>;
    public static create<T extends User>(
        options: ServerOptions & {
            extractUserFromRequest: (req: http.IncomingMessage) => T;
        },
        cb?: () => void
    ): Server<T>;
    public static create<T extends User>(
        options: ServerOptions & { extractUserFromRequest?: undefined | ((req: http.IncomingMessage) => T) } = {
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
