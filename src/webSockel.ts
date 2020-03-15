import WebSocket from "isomorphic-ws";
import uuid from "uuid";

/**
 * A message represents a opinionated way of sending data via WebSockets.
 * It is defined, by a type, its appended data (if needed) and some metaData
 */
export interface Message {
    type: string;
    data?: { [key: string]: string | object | number | boolean } | Message;
    waitingForResponse?: boolean;
}

export interface MessageMetaData {
    timestamp: string;
    messageId: string;
    waitingForResponse: boolean;
}

export interface InternalMessage extends Message {
    metaData: MessageMetaData;
}

export interface IsConnectedMessage extends Message {
    type: "IS_CONNECTED";
}

/**
 * This only serves as a representation of a WebSocket which will be used in as a parameter in custom defined
 * [[onmessage]] callbacks
 *
 * **Important**: This can only be instantiated with an already existing WebSocket,
 * for creating a connection to a websocketServer, see [[Client]]
 */
export class WebSockel {
    /**
     * The internally wrapped WebSocket
     */
    protected socket: WebSocket;

    /**
     * Accepts an external WebSocket as the input of the wrapped one, so the websocketServer can also wrap the incoming
     * WebSockets into WebSockel wrappers
     *
     * @param {WebSocket} ws
     */
    constructor(ws: WebSocket) {
        this.socket = ws;
    }

    /**
     * Tries to parse an arbitrary string into a message representation
     *
     * Will throw an error if the string is not in a valid json format or doesn't suffice the requirements to be
     * passed further along as a valid message
     *
     * @param message
     */
    public static parseAsInternalMessage(message: string): InternalMessage {
        let parsedMessage: object;

        try {
            parsedMessage = JSON.parse(message);
        } catch (error) {
            throw error;
        }

        if (WebSockel.isInternalMessage(parsedMessage)) {
            return parsedMessage;
        }

        throw new Error("Message is not in a valid format");
    }

    /**
     * A type check if the given input is a valid InternalMessage
     *
     * @param message
     */
    private static isInternalMessage(message: any): message is InternalMessage {
        return !(
            typeof message !== "object" ||
            !message.type ||
            !message.metaData ||
            !message.metaData.messageId ||
            !message.metaData.timestamp ||
            typeof message.type !== "string" ||
            typeof message.metaData !== "object" ||
            typeof message.metaData.timestamp !== "string" ||
            typeof message.metaData.messageId !== "string"
        );
    }

    /**
     * Sends a message via the underlying WebSocket connection
     *
     * Also passes meta data to the given messages so we can uniquely identify messages
     * between the client and the websocketServer
     *
     * @param message
     */
    public send<TMessage extends Message>(message: TMessage): InternalMessage {
        const internalMessage: InternalMessage = {
            type: message.type,
            data: message.data,
            metaData: {
                timestamp: new Date().toISOString(),
                messageId: uuid(),
                waitingForResponse: message.waitingForResponse ?? false,
            },
        };

        if (!WebSockel.isInternalMessage(internalMessage)) {
            throw new Error("Trying to send a message with an invalid format");
        }

        this.socket.send(JSON.stringify(internalMessage));

        return internalMessage;
    }

    /**
     * A passtrough wrapper for the original websocket close event
     *
     * @param code
     * @param data
     */
    public close(code?: number, data?: string) {
        this.socket.close(code, data);
    }
}
