import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryAuthUser } from "../../repositories/auth-user-repository";
import { checkRouteMiddleware } from "../../utils/check-route-middleware";

export class ControllerAuthUser extends ControllerRepositoryReadWrite<RepositoryAuthUser> {
  private repositoryAuthUser: RepositoryAuthUser;

  constructor() {
    const repositoryAuthUser = new RepositoryAuthUser();

    super({
      checkRouteMiddleware,
      baseRouteCheck: [
        { verb: "get", path: '/', featureCode: "global-read-show-rights" },
        { verb: "get", path: '/:id', featureCode: "global-read-show-rights" },
        { verb: "post", path: '/', featureCode: "global-write-rights" },
        { verb: "delete", path: '/:id', featureCode: "global-write-rights" },
        { verb: "patch", path: '/:id', featureCode: "global-write-rights" },
      ],
    });

    this.repositoryAuthUser = repositoryAuthUser;

    this.defineRoutes(
      {
        verb: 'post', path: '/:userUuid/group-copy', featureCode: "global-write-rights",
        handlers: this.copyUserGroups.bind(this)
      },
      {
        verb: 'patch', path: '/:userUuid/update-group', featureCode: "global-write-rights",
        handlers: this.updateUserGroups.bind(this)
      },
      {
        verb: 'get', path: '/:userUuid/effective-permissions', featureCode: "global-read-show-rights",
        handlers: this.getUserEffectivePermissions.bind(this)
      },
      {
        verb: 'get', path: '/:userUuid/check-feature-permissions/:featureUuid/:elementUuid', featureCode: "global-read-show-rights",
        handlers: this.checkFeaturePermissions.bind(this)
      },
      {
        verb: 'get', path: '/:userUuid/permissions', featureCode: "global-read-show-rights",
        handlers: this.getPermissions.bind(this)
      },
      {
        verb: 'get', path: '/:userUuid/groups', featureCode: "global-read-show-rights",
        handlers: this.getUserGroups.bind(this)
      },
      {
        verb: 'get', path: '/:userEmail/info', featureCode: "global-read-show-rights",
        handlers: this.getUserInfo.bind(this)
      },
      {
        verb: 'get', path: '/:userEmail/permission-info', featureCode: "global-read-show-rights",
        handlers: this.getUserPermissionInfo.bind(this)
      },
      {
        verb: 'get', path: '/:userEmail/element-permission/:scopeCode/:elementUuid', featureCode: "global-read-show-rights",
        handlers: this.getElementPermission.bind(this)
      },
    );
  }

  public static create(): Router {
    const controller = new ControllerAuthUser();
    return controller.create(controller.repositoryAuthUser);
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

  public async getUserEffectivePermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryAuthUser.getUserEffectivePermissions(userUuid);
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

  public async getUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryAuthUser.getUserGroups(userUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getUserInfo(req: Request, res: Response) {
    const userEmail = req.params.userEmail;
    try {
      const response = await this.repositoryAuthUser.getUserInfo(userEmail);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getUserPermissionInfo(req: Request, res: Response) {
    const userEmail = req.params.userEmail;
    try {
      const response = await this.repositoryAuthUser.getUserPermissionInfo(userEmail);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getElementPermission(req: Request, res: Response) {
    const userEmail = req.params.userEmail;
    const elementUuid = req.params.elementUuid;
    const scopeCode = req.params.scopeCode;
    try {
      const response = await this.repositoryAuthUser.getElementPermission(userEmail, scopeCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}