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

    this.addUser = this.addUser.bind(this);
    this.removeUser = this.removeUser.bind(this);

    this.defineRoutes(
      { verb: 'patch', path: '/add-user/:id', handlers: this.addUser },
      { verb: 'patch', path: '/remove-user/:id', handlers: this.removeUser },
    );
  }

  public static create(): Router {
    const controller = new ControllerUserGroup();
    return controller.create(controller.repositoryUserGroup);
  }

  public async addUser(req: Request, res: Response) {
    const userId = req.params.id;
    const groupId = req.body.groupUuid;
    try {
      await this.repositoryUserGroup.addUser(userId, groupId);
      res.status(200).json({ userId, groupId });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async removeUser(req: Request, res: Response) {
    const userId = req.params.id;
    const groupId = req.body.groupUuid;
    try {
      await this.repositoryUserGroup.removeUser(userId, groupId);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}