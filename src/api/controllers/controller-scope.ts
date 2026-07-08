import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryScope } from "../../repositories/scope-repository";
import { Router, Request, Response } from "express";
import { checkRouteMiddleware } from "../../utils/check-route-middleware";
import { Utils } from "@all41-dev/server.types";
export class ControllerScope extends ControllerRepositoryReadWrite<RepositoryScope> {
  private repositoryScope: RepositoryScope;

  constructor() {
    const repositoryScope = new RepositoryScope();

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

    this.repositoryScope = repositoryScope;

    this.defineRoutes(
      { verb: 'get', path: '/:scopeUuid/children', featureCode: "global-read-show-rights", handlers: this.getChildren.bind(this) },
      { verb: 'get', path: '/:scopeUuid/groups', featureCode: "global-read-show-rights", handlers: this.getGroups.bind(this) },
      { verb: 'get', path: '/:scopeUuid/features', featureCode: "global-read-show-rights", handlers: this.getFeatures.bind(this) },
      { verb: 'get', path: '/:scopeUuid/children/features', featureCode: "global-read-show-rights", handlers: this.getChildrenFeatures.bind(this) },
      { verb: 'get', path: '/:scopeCode/element_hierarchy/:elementUuid?', handlers: this.getElementHierarchy.bind(this) },
      { verb: 'get', path: '/element_hierarchy/all', featureCode: "global-read-show-rights", handlers: this.getAllElementHierarchy.bind(this) },
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
      Utils.logger.error(`getTree error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getChildren(req: Request, res: Response) {
    const scopeUuid = Array.isArray(req.params.scopeUuid) ? req.params.scopeUuid[0] : req.params.scopeUuid;;
    try {
      const response = await this.repositoryScope.getChildScopes(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getChildren error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getGroups(req: Request, res: Response) {
    const scopeUuid = Array.isArray(req.params.scopeUuid) ? req.params.scopeUuid[0] : req.params.scopeUuid;;
    try {
      const response = await this.repositoryScope.getScopeGroups(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getGroups error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getFeatures(req: Request, res: Response) {
    const scopeUuid = Array.isArray(req.params.scopeUuid) ? req.params.scopeUuid[0] : req.params.scopeUuid;;
    try {
      const response = await this.repositoryScope.getScopeFeatures(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getFeatures error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getChildrenFeatures(req: Request, res: Response) {
    const scopeUuid = Array.isArray(req.params.scopeUuid) ? req.params.scopeUuid[0] : req.params.scopeUuid;;
    try {
      const response = await this.repositoryScope.getScopeChildrenFeatures(scopeUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getChildrenFeatures error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getElementHierarchy(req: Request, res: Response) {
    const scopeCode = Array.isArray(req.params.scopeCode) ? req.params.scopeCode[0] : req.params.scopeCode;
    const elementUuid = Array.isArray(req.params.elementUuid) ? req.params.elementUuid[0] : req.params.elementUuid;
    try {
      const response = await this.repositoryScope.getElementHierarchy(scopeCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getElementHierarchy error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getAllElementHierarchy(req: Request, res: Response) {
    try {
      const response = await this.repositoryScope.getAllElementHierarchy();
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getAllElementHierarchy error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getElementAncestor(req: Request, res: Response) {
    const scopeCode = Array.isArray(req.params.scopeCode) ? req.params.scopeCode[0] : req.params.scopeCode;
    const elementUuid =  Array.isArray(req.params.elementUuid) ? req.params.elementUuid[0] : req.params.elementUuid;
    try {
      const response = await this.repositoryScope.getElementAncestor(scopeCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getElementAncestor error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}