import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryScope } from "../../repositories/scope-repository";
import { Router } from "express";
import { ScopeTable } from "../../db/scope-table";

export class ControllerScope extends ControllerRepositoryReadWrite<RepositoryScope> {
  private repositoryScope: RepositoryScope;

  constructor() {
    if (!ScopeTable.sequelize) {
      throw new Error("Sequelize not configured");
    }
    const sequelizeRepository = (ScopeTable.sequelize as any).getRepository(ScopeTable);

    const repositoryScope = new RepositoryScope(sequelizeRepository);

    super();

    this.repositoryScope = repositoryScope;
  }

  public static create(): Router {
    const controller = new ControllerScope();
    return controller.create(controller.repositoryScope);
  }

}