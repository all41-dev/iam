import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryPermission } from "../../repositories/permission-repository";
import { Router } from "express";
import { PermissionTable } from "../../db/permission-table";


export class ControllerPermission extends ControllerRepositoryReadWrite<RepositoryPermission> {
  private repositoryPermission: RepositoryPermission;

  constructor() {
    const repositoryPermission = new RepositoryPermission(PermissionTable);

    super();

    this.repositoryPermission = repositoryPermission;
  }

  public static create(): Router {
    const controller = new ControllerPermission();
    return controller.create(controller.repositoryPermission);
  }
}