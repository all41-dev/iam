import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryUserGroup } from "../../repositories/user-group-repository";
import { Router, Request, Response } from "express";
import { checkRouteMiddleware } from "../../utils/check-route-middleware";
import { Utils } from "@all41-dev/server.types";

export class ControllerUserGroup extends ControllerRepositoryReadWrite<RepositoryUserGroup> {
  private repositoryUserGroup: RepositoryUserGroup;

  constructor() {
    const repositoryUserGroup = new RepositoryUserGroup();

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

    this.repositoryUserGroup = repositoryUserGroup;

    this.defineRoutes(
      { verb: 'post', path: '/:groupUuid/add-users', featureCode: "global-write-rights", handlers: this.addUsers.bind(this) },
      { verb: 'post', path: '/:groupUuid/remove-users', featureCode: "global-write-rights", handlers: this.removeUsers.bind(this) },
      { verb: 'post', path: '/:groupUuid/copy', featureCode: "global-write-rights", handlers: this.copyGroup.bind(this) },
      { verb: 'get', path: '/:groupUuid/users', featureCode: "global-read-show-rights", handlers: this.getUsers.bind(this) },
      { verb: 'get', path: '/:groupUuid/permissions', featureCode: "global-read-show-rights", handlers: this.getPermissions.bind(this) },
      { verb: 'get', path: '/:groupUuid/effective-permissions', featureCode: "global-read-show-rights", handlers: this.getEffectivePermissions.bind(this) },
    );
  }

  public static create(): Router {
    const controller = new ControllerUserGroup();
    return controller.create(controller.repositoryUserGroup);
  }

  public async addUsers(req: Request, res: Response) {
    const groupUuid = Array.isArray(req.params.groupUuid) ? req.params.groupUuid[0] : req.params.groupUuid;
    const userUuids = Array.isArray(req.params.userUuids) ? req.params.userUuids : [req.params.userUuids];
    try {
      await this.repositoryUserGroup.addUsers(userUuids, groupUuid);
      res.status(200).json(`Users: ${userUuids} added to group ${groupUuid}`);
    } catch (error) {
      Utils.logger.error(`addUsers error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async removeUsers(req: Request, res: Response) {
    const groupUuid = Array.isArray(req.params.groupUuid) ? req.params.groupUuid[0] : req.params.groupUuid;
    const userUuids = Array.isArray(req.params.userUuids) ? req.params.userUuids : [req.params.userUuids];
    try {
      await this.repositoryUserGroup.removeUsers(userUuids, groupUuid);
      res.status(200).json(`Users: ${userUuids} removed from group ${groupUuid}`);
    } catch (error) {
      Utils.logger.error(`removeUsers error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getUsers(req: Request, res: Response) {
    const groupUuid = Array.isArray(req.params.groupUuid) ? req.params.groupUuid[0] : req.params.groupUuid;
    try {
      const response = await this.repositoryUserGroup.getUsers(groupUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getUsers error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getPermissions(req: Request, res: Response) {
    const groupUuid = Array.isArray(req.params.groupUuid) ? req.params.groupUuid[0] : req.params.groupUuid;
    try {
      const response = await this.repositoryUserGroup.getPermissions(groupUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getPermissions error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getEffectivePermissions(req: Request, res: Response) {
    const groupUuid = Array.isArray(req.params.groupUuid) ? req.params.groupUuid[0] : req.params.groupUuid;
    try {
      const response = await this.repositoryUserGroup.getEffectivePermissions(groupUuid);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`getEffectivePermissions error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async copyGroup(req: Request, res: Response) {
    const groupUuid = Array.isArray(req.params.groupUuid) ? req.params.groupUuid[0] : req.params.groupUuid;
    const newGroupName = Array.isArray(req.params.newGroupName) ? req.params.newGroupName[0] : req.params.newGroupName;
    try {
      const response = await this.repositoryUserGroup.copyGroup(groupUuid, newGroupName);
      res.status(200).json(response);
    } catch (error) {
      Utils.logger.error(`copyGroup error: ${error}`)
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}