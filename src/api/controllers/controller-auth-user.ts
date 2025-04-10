import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryAuthUser } from "../../repositories/auth-user-repository";

export class ControllerAuthUser extends ControllerRepositoryReadWrite<RepositoryAuthUser> {
  private repositoryAuthUser: RepositoryAuthUser;

  constructor() {
    const repositoryAuthUser = new RepositoryAuthUser();

    super();

    this.repositoryAuthUser = repositoryAuthUser;

    this.defineRoutes(
      { verb: 'post', path: '/:userUuid/set-group', handlers: this.setUserGroups.bind(this) },
      { verb: 'post', path: '/:userUuid/unset-group', handlers: this.unsetUserGroups.bind(this) },
      { verb: 'post', path: '/:userUuid/group-copy', handlers: this.copyUserGroups.bind(this) },
      { verb: 'patch', path: '/:userUuid/update-group', handlers: this.updateUserGroups.bind(this) },
      { verb: 'get', path: '/:userUuid/effective-permissions', handlers: this.checkUserEffectivePermissions.bind(this) },
      { verb: 'get', path: '/:userUuid/check-feature-permissions/:featureUuid/:elementUuid', handlers: this.checkFeaturePermissions.bind(this) },
      { verb: 'get', path: '/:userUuid/permissions', handlers: this.getPermissions.bind(this) },
      { verb: 'get', path: '/:userUuid/compact-permissions', handlers: this.getCompactPermissions.bind(this) },
      { verb: 'get', path: '/:userUuid/groups', handlers: this.getUserGroups.bind(this) }
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
    const userUuid = req.params.userUuid;
    const featureUuid = req.params.featureUuid;
    const elementUuid = req.params.elementUuid;
    try {
      const response = await this.repositoryAuthUser.checkFeaturePermissions(userUuid, featureUuid, elementUuid);
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

  public async getCompactPermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryAuthUser.getCompactPermissions(userUuid);
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

  public async copyUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid
    const userToCopyUuid = req.body.userToCopyUuid;
    try {
      const response = await this.repositoryAuthUser.copyUserGroups(userUuid, userToCopyUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}