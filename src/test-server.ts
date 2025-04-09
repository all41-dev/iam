import { IServerOptions, Server } from "@all41-dev/server";
import { AuthUtils } from "./auth/auth-utils";
import { IUtilsOptions } from "./interfaces";
import { scopeElementHierarchy, scopeElementAncestor } from "./utils/scope-element-dummy";

export class TestServer extends Server {
  public static inst: TestServer;
  private authUtils: AuthUtils;
  private authOptions: IUtilsOptions = { scopeElementAncestor: scopeElementAncestor, scopeElementHierarchy: scopeElementHierarchy }
  constructor(options: IServerOptions) {
    super(options);
    this.authUtils = AuthUtils.getInstance(this.authOptions)
    TestServer.inst = this;
  }

  async start() {
    await super.start();
    Server.logger.info('TestServer started');
  }
}