import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryUserGroup } from "../../repositories/user-group-repository";
import { Router, Request, Response } from "express";
import { UserGroupTable } from "../../db/user-group-table";

export class ControllerUserGroup extends ControllerRepositoryReadWrite<RepositoryUserGroup> {
  private repositoryUserGroup: RepositoryUserGroup;

  constructor() {
    const repositoryUserGroup = new RepositoryUserGroup(UserGroupTable);

    super();

    this.repositoryUserGroup = repositoryUserGroup;

    this.addUsers = this.addUsers.bind(this);
    this.removeUsers = this.removeUsers.bind(this);
    this.getUsers = this.getUsers.bind(this);
    this.getPermissions = this.getPermissions.bind(this);


    this.defineRoutes(
      { verb: 'post', path: '/:groupUuid/add-users', handlers: this.addUsers },
      { verb: 'post', path: '/:groupUuid/remove-users', handlers: this.removeUsers },
      { verb: 'get', path: '/:groupUuid/users', handlers: this.getUsers },
      { verb: 'get', path: '/:groupUuid/permissions', handlers: this.getPermissions },
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

}