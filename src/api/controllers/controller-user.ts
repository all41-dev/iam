import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryUser } from "../../repositories/user-repository";
import { checkRouteMiddleware } from "../../utils/check-route-middleware";
import { AuthUtils } from "../../auth/auth-utils";
import { IAMUser } from "../../interfaces";

export class ControllerUser extends ControllerRepositoryReadWrite<RepositoryUser> {
  private repositoryUser: RepositoryUser;
  private authUtils = AuthUtils.getInstance();

  constructor() {
    const repositoryUser = new RepositoryUser();

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

    this.repositoryUser = repositoryUser;

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
        verb: 'get', path: '/:userEmail/info',
        handlers: this.getUserInfo.bind(this)
      },
      {
        verb: 'get', path: '/:userEmail/permission-info',
        handlers: this.getUserPermissionInfo.bind(this)
      },
      {
        verb: 'get', path: '/:userEmail/element-permission/:scopeCode/:elementUuid',
        handlers: this.getElementPermission.bind(this)
      },
      {
        verb: 'get', path: '/access-list/:featureCode/:elementUuid',
        handlers: this.getUsersListWithAccess.bind(this)
      },
    );
  }

  public static create(): Router {
    const controller = new ControllerUser();
    return controller.create(controller.repositoryUser);
  }

  public async updateUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    const groupUuids = req.body.groupUuids;
    try {
      const response = await this.repositoryUser.updateGroups(userUuid, groupUuids);
      res.status(200).json(response ? response : {});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async copyUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid
    const userToCopyUuid = req.body.userToCopyUuid;
    try {
      const response = await this.repositoryUser.copyUserGroups(userUuid, userToCopyUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getUserEffectivePermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryUser.getUserEffectivePermissions(userUuid);
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
      const response = await this.repositoryUser.checkFeaturePermissions(userUuid, featureUuid, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getPermissions(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryUser.getPermissions(userUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getUserGroups(req: Request, res: Response) {
    const userUuid = req.params.userUuid;
    try {
      const response = await this.repositoryUser.getUserGroups(userUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getUserInfo(req: Request, res: Response) {
    const userEmail = req.params.userEmail;
    const hasGlobalAccess = await this.authUtils.checkAccess((req.user as IAMUser), "global-read-show-rights", process.env.GLOBAL_UUID || '') === "grant"
    if ((req.user as IAMUser).email !== userEmail && !hasGlobalAccess) res.status(403).send("Forbidden")
    try {
      const response = await this.repositoryUser.getUserInfo(userEmail);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getUserPermissionInfo(req: Request, res: Response) {
    const userEmail = req.params.userEmail;
    const hasGlobalAccess = await this.authUtils.checkAccess((req.user as IAMUser), "global-read-show-rights", process.env.GLOBAL_UUID || '') === "grant"
    if ((req.user as IAMUser).email !== userEmail && !hasGlobalAccess) res.status(403).send("Forbidden")
    try {
      const response = await this.repositoryUser.getUserPermissionInfo(userEmail);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getElementPermission(req: Request, res: Response) {
    const userEmail = req.params.userEmail;
    const hasGlobalAccess = await this.authUtils.checkAccess((req.user as IAMUser), "global-read-show-rights", process.env.GLOBAL_UUID || '') === "grant"
    if ((req.user as IAMUser).email !== userEmail && !hasGlobalAccess) res.status(403).send("Forbidden")
    const elementUuid = req.params.elementUuid;
    const scopeCode = req.params.scopeCode;
    try {
      const response = await this.repositoryUser.getElementPermission(userEmail, scopeCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  public async getUsersListWithAccess(req: Request, res: Response) {
    const featureCode = req.params.featureCode;
    const elementUuid = req.params.elementUuid;
    try {
      const response = await this.repositoryUser.getUsersListWithAccess(featureCode, elementUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}