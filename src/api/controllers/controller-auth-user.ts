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
    this.updateUserGroups = this.updateUserGroups.bind(this);
    this.checkUserEffectivePermissions = this.checkUserEffectivePermissions.bind(this);
    this.checkFeaturePermissions = this.checkFeaturePermissions.bind(this);
    this.getPermissions = this.getPermissions.bind(this);
    this.getUserGroups = this.getUserGroups.bind(this);

    this.defineRoutes(
      { verb: 'post', path: '/:userUuid/set-group', handlers: this.setUserGroups },
      { verb: 'post', path: '/:userUuid/unset-group', handlers: this.unsetUserGroups },
      { verb: 'patch', path: '/:userUuid/update-group', handlers: this.updateUserGroups },
      { verb: 'get', path: '/:userUuid/effective-permissions', handlers: this.checkUserEffectivePermissions },
      { verb: 'get', path: '/:email/check-feature-permissions/:featureCode/:elementUuid', handlers: this.checkFeaturePermissions },
      { verb: 'get', path: '/:userUuid/permissions', handlers: this.getPermissions },
      { verb: 'get', path: '/:userUuid/groups', handlers: this.getUserGroups }
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

  public async updateUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    const groupUuids = req.body.groupUuids;
    try {
      const response = await this.repositoryAuthUser.updateGroups(userUuid, groupUuids);
      res.status(200).json(response ? response : {});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async checkUserEffectivePermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryAuthUser.checkUserEffectivePermissions(userUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async checkFeaturePermissions(req: Request, res: Response) {
    const email = req.params.email;
    const featureCode = req.params.featureCode;
    const elementUuid = req.params.elementUuid;
    try {
      const response = await this.repositoryAuthUser.checkFeaturePermissions(email, featureCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getPermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryAuthUser.getPermissions(userUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryAuthUser.getUserGroups(userUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}