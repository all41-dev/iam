import { IServerOptions, Server } from "@all41-dev/server";
import { IAuthOptions } from "./interfaces";
import { AuthManager } from "./auth/auth-manager";

export class TestServer extends Server {
  public static inst: TestServer;
  protected _testAuth: AuthManager | undefined = undefined;

  constructor(options: IServerOptions) {
    super(options);
    if (options.auth) {
      this._registerAuth(options.auth);
    }
    TestServer.inst = this;
  }

  async start() {
    await super.start();
    Server.logger.info('TestServer started');
  }

  protected async _registerAuth(authOptions: IAuthOptions): Promise<void> {
    this._testAuth = AuthManager.getInstance(authOptions);

    this.app.use('/auth', this._testAuth.init());
  }
}