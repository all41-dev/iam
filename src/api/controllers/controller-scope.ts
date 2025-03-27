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
    this.getGroups = this.getGroups.bind(this);
    this.getFeatures = this.getFeatures.bind(this);
    this.getChildrenFeatures = this.getChildrenFeatures.bind(this);
    this.getElementHierarchy = this.getElementHierarchy.bind(this);

    this.defineRoutes(
      { verb: 'get', path: '/:scopeUuid/tree', handlers: this.getTree },
      { verb: 'get', path: '/:scopeUuid/children', handlers: this.getChildren },
      { verb: 'get', path: '/:scopeUuid/groups', handlers: this.getGroups },
      { verb: 'get', path: '/:scopeUuid/features', handlers: this.getFeatures },
      { verb: 'get', path: '/:scopeUuid/children/features', handlers: this.getChildrenFeatures },
      { verb: 'get', path: '/:scopeUuid/element_hierarchy/:elementUuid?', handlers: this.getElementHierarchy }
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

  public async getGroups(req: Request, res: Response) {
    const scopeUuid = req.params.scopeUuid;
    try {
      const response = await this.repositoryScope.getScopeGroups(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getFeatures(req: Request, res: Response) {
    const scopeUuid = req.params.scopeUuid;
    try {
      const response = await this.repositoryScope.getScopeFeatures(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getChildrenFeatures(req: Request, res: Response) {
    const scopeUuid = req.params.scopeUuid;
    try {
      const response = await this.repositoryScope.getScopeChildrenFeatures(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getElementHierarchy(req: Request, res: Response) {
    const scopeUuid = req.params.scopeUuid;
    const elementUuid = req.params.elementUuid
    try {
      const response = await this.repositoryScope.getElementHierarchy(scopeUuid, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}