import { IServerOptions, Server } from "@all41-dev/server";
import { AuthManager } from "./auth/auth-manager";

export class TestServer extends Server {
  public static instance: TestServer;

  constructor(options: IServerOptions) {
    super(options);
    TestServer.instance = this;
  }


  async start() {
    await super.start();
    Server.logger.info('TestServer started');
  }

  protected async _registerAuth(authOptions: any): Promise<void> {
    this._auth = AuthManager.getInstance(authOptions) as any;
    if (this._auth) this.app.use('/auth', this._auth.init());
  }
}