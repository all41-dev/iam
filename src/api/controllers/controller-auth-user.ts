import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryAuthUser } from "../../repositories/auth-user-repository";
import { checkPermission } from "../../utils/check-permission";

export class ControllerAuthUser extends ControllerRepositoryReadWrite<RepositoryAuthUser> {
  private repositoryAuthUser: RepositoryAuthUser;

  constructor() {
    const repositoryAuthUser = new RepositoryAuthUser();

    super();

    this.repositoryAuthUser = repositoryAuthUser;

    this.defineRoutes(
      {
        verb: 'post', path: '/:userUuid/group-copy',
        handlers: [checkPermission("global-write-rights"), this.copyUserGroups.bind(this)]
      },
      {
        verb: 'patch', path: '/:userUuid/update-group',
        handlers: [checkPermission("global-write-rights"), this.updateUserGroups.bind(this)]
      },
      {
        verb: 'get', path: '/:userUuid/effective-permissions',
        handlers: [checkPermission("global-read-show-rights"), this.getUserEffectivePermissions.bind(this)]
      },
      {
        verb: 'get', path: '/:userUuid/check-feature-permissions/:featureUuid/:elementUuid',
        handlers: [checkPermission("global-read-show-rights"), this.checkFeaturePermissions.bind(this)]
      },
      {
        verb: 'get', path: '/:userUuid/permissions',
        handlers: [checkPermission("global-read-show-rights"), this.getPermissions.bind(this)]
      },
      {
        verb: 'get', path: '/:userUuid/groups',
        handlers: [checkPermission("global-read-show-rights"), this.getUserGroups.bind(this)]
      },
      {
        verb: 'get', path: '/:userEmail/info',
        handlers: [checkPermission("global-read-show-rights"), this.getUserInfo.bind(this)]
      },
      {
        verb: 'get', path: '/:userEmail/permission-info',
        handlers: [checkPermission("global-read-show-rights"), this.getUserPermissionInfo.bind(this)]
      },
      {
        verb: 'get', path: '/:userEmail/element-permission/:scopeCode/:elementUuid',
        handlers: [checkPermission("global-read-show-rights"), this.getElementPermission.bind(this)]
      },
      {
        verb: 'post', path: "/", handlers: [
          checkPermission("global-write-rights"),
          this.post
        ]
      },
      {
        verb: 'patch', path: "/:id", handlers: [
          checkPermission("global-write-rights"),
          this.patch
        ]
      },
      {
        verb: 'delete', path: "/:id", handlers: [
          checkPermission("global-write-rights"),
          this.delete
        ]
      },
      {
        verb: 'get', path: "/", handlers: [
          checkPermission("global-read-show-rights"),
          this.getAll
        ]
      },
      {
        verb: 'get', path: "/:id", handlers: [
          checkPermission("global-read-show-rights"),
          this.getById
        ]
      }
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