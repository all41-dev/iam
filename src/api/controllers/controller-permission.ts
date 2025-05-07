import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryPermission } from "../../repositories/permission-repository";
import { Router } from "express";
import { checkPermission } from "../../utils/check-permission";

export class ControllerPermission extends ControllerRepositoryReadWrite<RepositoryPermission> {
  private repositoryPermission: RepositoryPermission;

  constructor() {
    const repositoryPermission = new RepositoryPermission();

    super();

    this.defineRoutes(
      {
        verb: 'post', path: "/", handlers: [
          checkPermission("global-write-rights"),
          this.post
        ]
      },
      {
        verb: 'patch', path: "/:id", handlers: [
          checkPermission("global-write-rights"),
          this.patch
        ]
      },
      {
        verb: 'delete', path: "/:id", handlers: [
          checkPermission("global-write-rights"),
          this.delete
        ]
      },
      {
        verb: 'get', path: "/", handlers: [
          checkPermission("global-read-show-rights"),
          this.getAll
        ]
      },
      {
        verb: 'get', path: "/:id", handlers: [
          checkPermission("global-read-show-rights"),
          this.getById
        ]
      })

    this.repositoryPermission = repositoryPermission;
  }

  public static create(): Router {
    const controller = new ControllerPermission();
    return controller.create(controller.repositoryPermission);
  }
}