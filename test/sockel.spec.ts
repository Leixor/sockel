import { expect } from "chai";
import * as http from "http";
import { Message } from "../src/webSockel";
import { SockelClient, SockelServer } from "../src";
import uuid = require("uuid");
import Test = Mocha.Test;

interface TestMessage extends Message {
    type: "TEST_MESSAGE";
    data: { testString: string };
}

describe("Sockel", () => {
    const websocketServerPort = 3006;
    const testMessage: TestMessage = { type: "TEST_MESSAGE", data: { testString: "cool" } };

    const extractUserFromRequest = (req: http.IncomingMessage) => ({ id: "Test", type: 3 });
    const sockelServer = SockelServer.create({
        port: websocketServerPort,
        extractUserFromRequest,
    });

    let sockelClient: SockelClient;

    before(() => {
        sockelServer.purgeOnMessageCallbacks();
    });
    after(() => {
        sockelServer.close();
    });

    describe("Server", () => {
        beforeEach(async () => {
            sockelClient = await SockelClient.open(`ws://localhost:${websocketServerPort}`);
        });

        afterEach(() => {
            sockelClient.close();
        });

        it("calls onmessage callback onmessage correct message type", (done) => {
            sockelServer.onmessage("TEST_MESSAGE", (data, connectedUser) => {
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
            sockelClient = await SockelClient.open(`ws://localhost:${websocketServerPort}`);
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
    });
});
