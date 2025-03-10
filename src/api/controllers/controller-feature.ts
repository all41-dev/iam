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

    this.defineRoutes({ verb: 'post', path: '/set-parent-child', handlers: this.setParentChild });
  }

  public static create(): Router {
    const controller = new ControllerFeature();
    return controller.create(controller.repositoryFeature);
  }

  public async setParentChild(req: Request, res: Response) {
    const parentId = req.body.parentUuid;
    const childId = req.body.childUuid;
    try {
      await this.setParentChild(parentId, childId);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async removeParentChild(req: Request, res: Response) {
    const parentId = req.body.parentUuid;
    const childId = req.body.childUuid;
    try {
      await this.removeParentChild(parentId, childId);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}