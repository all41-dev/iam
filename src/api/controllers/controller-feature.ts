import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryFeature } from "../../repositories/feature-repository";
import { Router, Request, Response } from "express";
import { FeatureTable } from "../../db/feature-table";

export class ControllerFeature extends ControllerRepositoryReadWrite<RepositoryFeature> {
  private repositoryFeature: RepositoryFeature;

  constructor() {
    const repositoryFeature = new RepositoryFeature(FeatureTable);

    super();

    this.repositoryFeature = repositoryFeature;

    this.setParentChild = this.setParentChild.bind(this);
    this.removeParentChild = this.removeParentChild.bind(this);
    this.getChildrens = this.getChildrens.bind(this);
    this.getFeatureMatrix = this.getFeatureMatrix.bind(this);
    this.getRootFeatureMatrix = this.getRootFeatureMatrix.bind(this);
    this.getScopeFeatureMatrix = this.getScopeFeatureMatrix.bind(this);

    this.defineRoutes(
      { verb: 'post', path: '/set-parent-child', handlers: this.setParentChild },
      { verb: 'post', path: '/remove-parent-child', handlers: this.removeParentChild },
      { verb: 'get', path: '/:featureUuid/childrens', handlers: this.getChildrens },
      { verb: 'get', path: '/:featureUuid/matrix', handlers: this.getFeatureMatrix },
      { verb: 'get', path: '/:scopeUuid/feature-matrix', handlers: this.getScopeFeatureMatrix },
    );
    this.defineRouteBeforeSignature(
      { verb: 'get', path: '/:id' },
      { verb: 'get', path: '/root-feature-matrix', handlers: this.getRootFeatureMatrix },
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

}