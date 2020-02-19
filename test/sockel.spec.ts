import { expect } from "chai";
import Client from "../src/client";
import * as http from "http";
import { Message } from "../src/sockel";
import Server from "../src/server";

interface TestMessage extends Message {
    type: "TEST_MESSAGE";
    data: { testString: string };
}

describe("Sockel", () => {
    let sockelClient: Client;
    const websocketServerPort = 3006;
    const message: TestMessage = { type: "TEST_MESSAGE", data: { testString: "cool" } };

    const extractUserFromRequest = (req: http.IncomingMessage) => ({ id: "", type: 3 });

    let sockelServer: Server<ReturnType<typeof extractUserFromRequest>>;

    before(() => {
        sockelServer = Server.create({
            port: websocketServerPort,
            extractUserFromRequest: (req) => ({ type: 2, id: "Test" }),
        });
    });

    after(() => {
        sockelServer.close();
    });

    describe("Server", () => {
        beforeEach(() => {
            sockelClient = new Client(`ws://localhost:${websocketServerPort}`);
            sockelServer.purgeOnMessageCallbacks();
        });

        afterEach(() => {
            sockelClient.close();
        });

        it("calls onmessage callback onmessage correct message type", (done) => {
            sockelServer.onmessage<TestMessage>("TEST_MESSAGE", (data, connectedUser) => {
                expect(connectedUser.user.id).to.be.equal("Test");
                done();
            });

            sockelClient.onopen(() => {
                sockelClient.send(message);
            });
        });
    });

    describe("Client", () => {
        beforeEach((done) => {
            sockelClient = new Client(`ws://localhost:${websocketServerPort}`);
            sockelServer.purgeOnMessageCallbacks();

            done();
        });

        afterEach(() => {
            sockelClient.close();
        });

        it("calls onmessage callback onmessage correct message type", function(done) {
            sockelClient.onmessage<TestMessage>("TEST_MESSAGE", (data, ws) => {
                expect(data.testString).to.be.equal("cool");
                done();
            });

            sockelClient.onopen(() => {
                sockelServer.sendToUser("Test", message);
            });
        });
    });
});
