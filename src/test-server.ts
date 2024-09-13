import { IServerOptions, Server } from "@all41-dev/server";

export class TestServer extends Server {
    public static inst: TestServer;

    constructor(options: IServerOptions) {
        super(options);

        TestServer.inst = this;
    }

    async start() {
        await super.start();
        Server.logger.info('TestServer started');
    }
}