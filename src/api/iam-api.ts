import { Api } from "@all41-dev/server";
import { ControllerUserGroup } from "./controllers/controller-user-group";
import { ControllerScope } from "./controllers/controller-scope";
import { ControllerFeature } from "./controllers/controller-feature";
import { ControllerPermission } from "./controllers/controller-permission";
import { ControllerAuthUser } from "./controllers/controller-auth-user";
import { Router } from "express";

export class IamApi extends Api<IamApi> {
  public static inst: IamApi;

  public setStaticInst(): void {
    IamApi.inst = this;
  }

  public init(): Router {
    this.router.use("/groups", ControllerUserGroup.create());
    this.router.use("/auth-users", ControllerAuthUser.create());
    this.router.use("/scopes", ControllerScope.create());
    this.router.use("/features", ControllerFeature.create());
    this.router.use("/permissions", ControllerPermission.create());

    return this.router;
  }
}
