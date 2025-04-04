import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryPermission } from "../../repositories/permission-repository";
import { Router } from "express";

export class ControllerPermission extends ControllerRepositoryReadWrite<RepositoryPermission> {
  private repositoryPermission: RepositoryPermission;

  constructor() {
    const repositoryPermission = new RepositoryPermission();

    super();

    this.repositoryPermission = repositoryPermission;
  }

  public static create(): Router {
    const controller = new ControllerPermission();
    return controller.create(controller.repositoryPermission);
  }
}