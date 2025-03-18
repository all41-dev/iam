import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryScope } from "../../repositories/scope-repository";
import { Router, Request, Response } from "express";
import { ScopeTable } from "../../db/scope-table";

export class ControllerScope extends ControllerRepositoryReadWrite<RepositoryScope> {
  private repositoryScope: RepositoryScope;

  constructor() {
    const repositoryScope = new RepositoryScope(ScopeTable);

    super();

    this.repositoryScope = repositoryScope;

    this.getTree = this.getTree.bind(this);
    this.getChildren = this.getChildren.bind(this);

    this.defineRoutes(
      { verb: 'get', path: '/:scopeUuid/tree', handlers: this.getTree },
      { verb: 'get', path: '/:scopeUuid/children', handlers: this.getChildren },
    );
  }

  public static create(): Router {
    const controller = new ControllerScope();
    return controller.create(controller.repositoryScope);
  }

  public async getTree(req: Request, res: Response) {
    const scopeUuid = req.params.scopeUuid;
    try {
      const response = await this.repositoryScope.getTreeScopes(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getChildren(req: Request, res: Response) {
    const scopeUuid = req.params.scopeUuid;
    try {
      const response = await this.repositoryScope.getChildScopes(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}