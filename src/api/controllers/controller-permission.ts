import { Router } from "express";
import { RepositoryPermission } from "../../repositories/permission-repository";
import { checkRouteMiddleware } from "../../utils/check-route-middleware";
import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";

export class ControllerPermission extends ControllerRepositoryReadWrite<RepositoryPermission> {
  private repositoryPermission: RepositoryPermission;

  constructor() {
    const repositoryPermission = new RepositoryPermission();

    super({
      checkRouteMiddleware,
      baseRouteCheckAuth: [
        { verb: "get", path: '/', featureCode: "global-read-show-rights" },
        { verb: "get", path: '/:id', featureCode: "global-read-show-rights" },
        { verb: "post", path: '/', featureCode: "global-write-rights" },
        { verb: "delete", path: '/:id', featureCode: "global-write-rights" },
        { verb: "patch", path: '/:id', featureCode: "global-write-rights" },
      ],
    });

    this.repositoryPermission = repositoryPermission;
  }

  public static create(): Router {
    const controller = new ControllerPermission();
    return controller.create(controller.repositoryPermission);
  }
}