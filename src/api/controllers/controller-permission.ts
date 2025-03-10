import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryPermission } from "../../repositories/permission-repository";
import { Router } from "express";
import { PermissionTable } from "../../db/permission-table";


export class ControllerPermission extends ControllerRepositoryReadWrite<RepositoryPermission> {
  private repositoryPermission: RepositoryPermission;

  constructor() {
    if (!PermissionTable.sequelize) {
      throw new Error("Sequelize not configured");
    }
    const sequelizeRepository = (PermissionTable.sequelize as any).getRepository(PermissionTable);

    const repositoryPermission = new RepositoryPermission(sequelizeRepository);

    super();

    this.repositoryPermission = repositoryPermission;
  }

  public static create(): Router {
    const controller = new ControllerPermission();
    return controller.create(controller.repositoryPermission);
  }
}