import WebSocket from "isomorphic-ws";
import uuid from "uuid";

export interface Message {
    type: string;
    data: { [key: string]: string | object | number | boolean } | Message;
}

export interface InternalMessage extends Message {
    metaData: { timestamp: string; messageId: string };
}

export interface IsConnectedMessage extends Message {
    type: "IS_CONNECTED";
    data: {};
}

/**
 * This is not a one to one replacement for a Websocket, but instead just a wrapper which the client and the server
 * can use in their request handling
 */
export class WebSockel {
    /**
     * The internally wrapped socket
     */
    protected socket: WebSocket;

    /**
     * We pass an websocket instance in here instead of the tradional parameters so we can wrap incoming sockets for
     * the server as well
     * @param ws
     */
    constructor(ws: WebSocket) {
        this.socket = ws;
    }

    public static parseAsInternalMessage(message: string): InternalMessage {
        try {
            const parsedMessage = JSON.parse(message);

            if (isInternalMessage(parsedMessage)) {
                return parsedMessage;
            }

            throw new Error("Message is not in a valid format");
        } catch (error) {
            throw error;
        }
    }

    /**
     * We can only send messages with the given format {type: string, data: Serializable}
     * We also send meta data to the given messages so we can uniquely identify messages between the client and the
     * server
     *
     * @param message
     */
    public send<TMessage extends Message>(message: TMessage): InternalMessage | void {
        const internalMessage: InternalMessage = {
            type: message.type,
            data: message.data,
            metaData: { timestamp: new Date().toISOString(), messageId: uuid() },
        };

        this.socket.send(JSON.stringify(internalMessage));

        return internalMessage;
    }

    /**
     * Passtrough wrapper for the original websocket close event
     *
     * @param code
     * @param data
     */
    public close(code?: number, data?: string) {
        this.socket.close(code, data);
    }
}

function isInternalMessage(message: any): message is InternalMessage {
    return !(
        !message.type ||
        !message.metaData ||
        !message.metaData.messageId ||
        !message.metaData.timestamp ||
        !message.data ||
        typeof message.type !== "string" ||
        typeof message.data !== "object" ||
        typeof message.metaData !== "object" ||
        typeof message.metaData.timestamp !== "string" ||
        typeof message.metaData.messageId !== "string"
    );
}
