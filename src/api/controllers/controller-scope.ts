import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryScope } from "../../repositories/scope-repository";
import { Router } from "express";
import { ScopeTable } from "../../db/scope-table";

export class ControllerScope extends ControllerRepositoryReadWrite<RepositoryScope> {
  private repositoryScope: RepositoryScope;

  constructor() {
    const repositoryScope = new RepositoryScope(ScopeTable);

    super();

    this.repositoryScope = repositoryScope;
  }

  public static create(): Router {
    const controller = new ControllerScope();
    return controller.create(controller.repositoryScope);
  }

}