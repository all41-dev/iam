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
    this.getChildren = this.getChildren.bind(this);
    this.getFeatureTree = this.getFeatureTree.bind(this)

    this.defineRoutes(
      { verb: 'post', path: '/set-parent-child', handlers: this.setParentChild },
      { verb: 'post', path: '/remove-parent-child', handlers: this.removeParentChild },
      { verb: 'get', path: '/get-children/:featureUuid', handlers: this.getChildren },
      { verb: 'get', path: '/get-tree/:featureUuid', handlers: this.getFeatureTree }
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
      await this.repositoryFeature.setParentChild(parentId, childId);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async removeParentChild(req: Request, res: Response) {
    const parentId = req.body.parentUuid;
    const childId = req.body.childUuid;
    try {
      await this.repositoryFeature.removeParentChild(parentId, childId);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getChildren(req: Request, res: Response) {
    const featureUuid = req.params.featureUuid;
    try {
      const response = await this.repositoryFeature.getChildren(featureUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getFeatureTree(req: Request, res: Response) {
    const featureUuid = req.params.featureUuid || null;
    try {
      const tree = await this.repositoryFeature.getFeatureTree(featureUuid);
      res.status(200).json(tree);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}