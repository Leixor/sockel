import * as http from "http";
import uuid = require("uuid");
import Test = Mocha.Test;
import { Client, Message, Server } from "../src";

interface TestMessage extends Message {
    type: "TEST_MESSAGE";
    data: { testString: string };
}

const chai = require("chai");
const expect = chai.expect;
chai.use(require("chai-as-promised"));

describe("Sockel", () => {
    const websocketServerPort = 3006;
    const testMessage: TestMessage = { type: "TEST_MESSAGE", data: { testString: "cool" } };

    const extractUserFromRequest = (req: http.IncomingMessage) => ({ id: "Test", type: 3 });

    const sockelServer = Server.create({
        port: websocketServerPort,
        extractUserFromRequest,
    });

    let sockelClient: Client;

    before(() => {
        sockelServer.purgeOnMessageCallbacks();
    });
    after(() => {
        sockelServer.close();
    });

    describe("Server", () => {
        beforeEach(async () => {
            sockelClient = await Client.connect(`ws://localhost:${websocketServerPort}`);
            sockelServer.purgeOnMessageCallbacks();
        });

        afterEach(() => {
            sockelClient.close();
        });

        it("calls onmessage callback on correct message type", (done) => {
            sockelServer.onmessage("TEST_MESSAGE", async (data, connectedUser) => {
                expect(connectedUser.user.id).to.be.equal("Test");
                done();
            });

            sockelClient.send(testMessage);
        });

        it("fails to send to user if user doesnt exist", () => {
            const userId = uuid();

            expect(() => {
                sockelServer.sendToUser(userId, { type: "", data: {} });
            }).to.throw(`User with id ${userId} doesn't exist`);
        });
    });

    describe("Client", () => {
        beforeEach(async () => {
            sockelClient = await Client.connect(`ws://localhost:${websocketServerPort}`);
            sockelServer.purgeOnMessageCallbacks();
        });

        afterEach(() => {
            sockelClient.close();
        });

        it("calls onmessage callback onmessage correct message type", (done) => {
            sockelClient.onmessage<TestMessage>("TEST_MESSAGE", (data) => {
                expect(data.testString).to.be.equal(testMessage.data.testString);
                done();
            });

            sockelServer.sendToUser("Test", testMessage);
        });

        it("can wait for request callback response", async () => {
            sockelServer.onmessage("TEST_MESSAGE", async () => {
                return { type: "SYNC_MESSAGE" };
            });

            const response = await sockelClient.request(testMessage);

            expect(response.type).to.be.equal("SYNC_MESSAGE");
        });

        it("timeouts when websocketServer didn't define the route a client is requesting", async () => {
            await expect(sockelClient.request(testMessage, 1500)).to.be.rejectedWith(
                "Timeout while waiting for a response from the websocketServer"
            );
        });
    });
});
