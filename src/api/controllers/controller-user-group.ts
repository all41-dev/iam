import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryUserGroup } from "../../repositories/user-group-repository";
import { Router, Request, Response } from "express";
import { checkPermission } from "../../utils/check-permission";

export class ControllerUserGroup extends ControllerRepositoryReadWrite<RepositoryUserGroup> {
  private repositoryUserGroup: RepositoryUserGroup;

  constructor() {
    const repositoryUserGroup = new RepositoryUserGroup();

    super();

    this.repositoryUserGroup = repositoryUserGroup;

    this.defineRoutes(
      { verb: 'post', path: '/:groupUuid/add-users', handlers: [checkPermission("global-write-rights"), this.addUsers.bind(this)] },
      { verb: 'post', path: '/:groupUuid/remove-users', handlers: [checkPermission("global-write-rights"), this.removeUsers.bind(this)] },
      { verb: 'post', path: '/:groupUuid/copy', handlers: [checkPermission("global-write-rights"), this.copyGroup.bind(this)] },
      { verb: 'get', path: '/:groupUuid/users', handlers: [checkPermission("global-read-show-rights"), this.getUsers.bind(this)] },
      { verb: 'get', path: '/:groupUuid/permissions', handlers: [checkPermission("global-read-show-rights"), this.getPermissions.bind(this)] },
      { verb: 'get', path: '/:groupUuid/effective-permissions', handlers: [checkPermission("global-read-show-rights"), this.getEffectivePermissions.bind(this)] },
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
    const controller = new ControllerUserGroup();
    return controller.create(controller.repositoryUserGroup);
  }

  public async addUsers(req: Request, res: Response) {
    const groupUuid = req.params.groupUuid;
    const userUuids = req.body.userUuids;
    try {
      await this.repositoryUserGroup.addUsers(userUuids, groupUuid);
      res.status(200).json(`Users: ${userUuids} added to group ${groupUuid}`);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async removeUsers(req: Request, res: Response) {
    const groupUuid = req.params.groupUuid;
    const userUuids = req.body.userUuids;
    try {
      await this.repositoryUserGroup.removeUsers(userUuids, groupUuid);
      res.status(200).json(`Users: ${userUuids} removed from group ${groupUuid}`);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getUsers(req: Request, res: Response) {
    const groupUuid = req.params.groupUuid;
    try {
      const response = await this.repositoryUserGroup.getUsers(groupUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getPermissions(req: Request, res: Response) {
    const groupUuid = req.params.groupUuid
    try {
      const response = await this.repositoryUserGroup.getPermissions(groupUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getEffectivePermissions(req: Request, res: Response) {
    const groupUuid = req.params.groupUuid
    try {
      const response = await this.repositoryUserGroup.getEffectivePermissions(groupUuid);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async copyGroup(req: Request, res: Response) {
    const groupUuid = req.params.groupUuid
    const newGroupName = req.body.newGroupName;
    try {
      const response = await this.repositoryUserGroup.copyGroup(groupUuid, newGroupName);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}