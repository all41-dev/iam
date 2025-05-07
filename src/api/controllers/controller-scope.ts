import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryScope } from "../../repositories/scope-repository";
import { Router, Request, Response } from "express";
import { checkPermission } from "../../utils/check-permission";
export class ControllerScope extends ControllerRepositoryReadWrite<RepositoryScope> {
  private repositoryScope: RepositoryScope;

  constructor() {
    const repositoryScope = new RepositoryScope();

    super();

    this.repositoryScope = repositoryScope;

    this.defineRoutes(
      { verb: 'get', path: '/:scopeUuid/children', handlers: [checkPermission("global-read-show-rights"), this.getChildren.bind(this)] },
      { verb: 'get', path: '/:scopeUuid/groups', handlers: [checkPermission("global-read-show-rights"), this.getGroups.bind(this)] },
      { verb: 'get', path: '/:scopeUuid/features', handlers: [checkPermission("global-read-show-rights"), this.getFeatures.bind(this)] },
      { verb: 'get', path: '/:scopeUuid/children/features', handlers: [checkPermission("global-read-show-rights"), this.getChildrenFeatures.bind(this)] },
      { verb: 'get', path: '/:scopeCode/element_hierarchy/:elementUuid?', handlers: [checkPermission("global-read-show-rights"), this.getElementHierarchy.bind(this)] },
      { verb: 'get', path: '/:scopeCode/element_ancestor/:elementUuid', handlers: [checkPermission("global-read-show-rights"), this.getAllElementHierarchy.bind(this)] },
      { verb: 'get', path: '/element_hierarchy/all', handlers: [checkPermission("global-read-show-rights"), this.getAllElementHierarchy.bind(this)] },
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
      }
    );
    this.defineRouteBeforeSignature(
      { verb: 'get', path: '/:id' },
      { verb: 'get', path: '/tree', handlers: this.getTree.bind(this) },
    );
  }

  public static create(): Router {
    const controller = new ControllerScope();
    return controller.create(controller.repositoryScope);
  }

  public async getTree(req: Request, res: Response) {
    try {
      const response = await this.repositoryScope.getTreeScopes();
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
    const scopeCode = req.params.scopeCode;
    const elementUuid = req.params.elementUuid
    try {
      const response = await this.repositoryScope.getElementHierarchy(scopeCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getAllElementHierarchy(req: Request, res: Response) {
    try {
      const response = await this.repositoryScope.getAllElementHierarchy();
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getElementAncestor(req: Request, res: Response) {
    const scopeCode = req.params.scopeCode;
    const elementUuid = req.params.elementUuid
    try {
      const response = await this.repositoryScope.getElementAncestor(scopeCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}