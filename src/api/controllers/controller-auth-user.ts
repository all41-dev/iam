import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryAuthUser } from "../../repositories/auth-user-repository";
import { AuthUserTable } from "../../db/auth-user-table";

export class ControllerAuthUser extends ControllerRepositoryReadWrite<RepositoryAuthUser> {
  private repositoryAuthUser: RepositoryAuthUser;

  constructor() {
    const repositoryAuthUser = new RepositoryAuthUser(AuthUserTable);

    super();

    this.repositoryAuthUser = repositoryAuthUser;

    this.setUserGroups = this.setUserGroups.bind(this);
    this.unsetUserGroups = this.unsetUserGroups.bind(this);
    this.checkUserPermissions = this.checkUserPermissions.bind(this)
    this.checkFeaturePermissions = this.checkFeaturePermissions.bind(this)

    this.defineRoutes(
      { verb: 'post', path: '/:userUuid/set-group', handlers: this.setUserGroups },
      { verb: 'post', path: '/:userUuid/unset-group', handlers: this.unsetUserGroups },
      { verb: 'get', path: '/:userUuid/check-permissions', handlers: this.checkUserPermissions },
      { verb: 'get', path: '/:userUuid/check-feature-permissions/:featureCode/:elementUuid', handlers: this.checkFeaturePermissions },
    );
  }

  public static create(): Router {
    const controller = new ControllerAuthUser();
    return controller.create(controller.repositoryAuthUser);
  }


  public async setUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    const groupUuids = req.body.groupUuids;
    try {
      await this.repositoryAuthUser.addGroups(userUuid, groupUuids);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async unsetUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    const groupUuids = req.body.groupUuids;
    try {
      await this.repositoryAuthUser.removeGroups(userUuid, groupUuids);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async checkUserPermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryAuthUser.checkUserPermissions(userUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async checkFeaturePermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    const featureCode = req.params.featureCode;
    const elementUuid = req.params.elementUuid;
    try {
      const response = await this.repositoryAuthUser.checkFeaturePermissions(userUuid, featureCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}