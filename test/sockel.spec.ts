import { Message, Sockel } from "../src/sockel";
import { expect } from "chai";
import { SockelClient } from "../src/sockelClient";
import * as http from "http";

interface TestMessage extends Message {
    type: "TEST_MESSAGE";
    data: { testString: string };
}

describe("Sockel", () => {
    let client: SockelClient;
    const websocketServerPort = 3006;
    const message: TestMessage = { type: "TEST_MESSAGE", data: { testString: "cool" } };

    const extractUserFromRequest = (req: http.IncomingMessage) => ({ id: "", type: 2 });

    let sockel: Sockel<ReturnType<typeof extractUserFromRequest>>;

    before(() => {
        sockel = Sockel.create({
            port: websocketServerPort,
            extractUserFromRequest: (req) => ({ type: 2, id: "Test" }),
        });
    });

    after(() => {
        sockel.close();
    });

    describe("Server", () => {
        beforeEach(() => {
            client = new SockelClient(`ws://localhost:${websocketServerPort}`);
            sockel.purgeOnMessageCallbacks();
        });

        afterEach(() => {
            client.close();
        });

        it("calls onMessage callback on correct message type", (done) => {
            sockel.onMessage<TestMessage>("TEST_MESSAGE", (data, connectedUser) => {
                expect(connectedUser.user.id).to.be.equal("Test");
                done();
            });

            client.on("open", () => {
                client.send(message);
            });
        });
    });

    describe("Client", () => {
        beforeEach((done) => {
            client = new SockelClient(`ws://localhost:${websocketServerPort}`);
            sockel.purgeOnMessageCallbacks();

            done();
        });

        afterEach(() => {
            client.close();
        });

        it("calls onMessage callback on correct message type", function(done) {
            client.onMessage<TestMessage>("TEST_MESSAGE", (data, ws) => {
                expect(data.testString).to.be.equal("cool");
                done();
            });

            client.on("open", () => {
                sockel.sendToUser("Test", message);
            });
        });
    });
});
