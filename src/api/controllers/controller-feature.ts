import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryFeature } from "../../repositories/feature-repository";
import { Router, Request, Response } from "express";

export class ControllerFeature extends ControllerRepositoryReadWrite<RepositoryFeature> {
  private repositoryFeature: RepositoryFeature;

  constructor() {
    const repositoryFeature = new RepositoryFeature();

    super();

    this.repositoryFeature = repositoryFeature;

    this.defineRoutes(
      { verb: 'post', path: '/set-parent-child', handlers: this.setParentChild.bind(this) },
      { verb: 'post', path: '/remove-parent-child', handlers: this.removeParentChild.bind(this) },
      { verb: 'get', path: '/:featureUuid/childrens', handlers: this.getChildrens.bind(this) },
      { verb: 'get', path: '/:featureUuid/matrix', handlers: this.getFeatureMatrix.bind(this) },
      { verb: 'get', path: '/scope/:scopeUuid/feature-matrix', handlers: this.getScopeFeatureMatrix.bind(this) },
      { verb: 'get', path: '/feature-composition/all', handlers: this.getAllFeatureComposition.bind(this) },
    );
    this.defineRouteBeforeSignature(
      { verb: 'get', path: '/:id' },
      { verb: 'get', path: '/root-matrix', handlers: this.getRootFeatureMatrix.bind(this) },
    );

  }

  public static create(): Router {
    const controller = new ControllerFeature();
    return controller.create(controller.repositoryFeature);
  }

  public async setParentChild(req: Request, res: Response) {
    const parentId = req.body.parentUuid;
    const childId = req.body.childUuid;
    try {
      const response = await this.repositoryFeature.setParentChild(parentId, childId);
      res.status(200).json(response ? response : {});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async removeParentChild(req: Request, res: Response) {
    const parentId = req.body.parentUuid;
    const childId = req.body.childUuid;
    try {
      const response = await this.repositoryFeature.removeParentChild(parentId, childId);
      res.status(200).json(response ? response : {});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getChildrens(req: Request, res: Response) {
    const featureUuid = req.params.featureUuid;
    try {
      const response = await this.repositoryFeature.getChildrens(featureUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getFeatureMatrix(req: Request, res: Response) {
    const featureUuid = req.params.featureUuid;
    try {
      const tree = await this.repositoryFeature.getFeatureMatrix(featureUuid);
      res.status(200).json(tree);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getRootFeatureMatrix(req: Request, res: Response) {
    try {
      const tree = await this.repositoryFeature.getRootFeatureMatrix();
      res.status(200).json(tree);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getScopeFeatureMatrix(req: Request, res: Response) {
    const scopeUuid = req.params.scopeUuid;
    try {
      const tree = await this.repositoryFeature.getScopeFeatureMatrix(scopeUuid);
      res.status(200).json(tree);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getAllFeatureComposition(req: Request, res: Response) {
    try {
      const tree = await this.repositoryFeature.getAllFeatureComposition();
      res.status(200).json(tree);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}