import { ControllerRepositoryReadWrite, Server } from "@all41-dev/server";
import { RepositoryUserGroup } from "../../repositories/user-group-repository";
import { Router, Request, Response } from "express";

export class ControllerUserGroup extends ControllerRepositoryReadWrite<RepositoryUserGroup> {
  private repositoryUserGroup: RepositoryUserGroup;

  constructor() {
    super();
    this.repositoryUserGroup = new RepositoryUserGroup();
  }

  public static create(): Router {
    return new ControllerUserGroup().create(RepositoryUserGroup);
  }

  public async addUser(req : Request, res : Response) {
    const userId = req.params.id;
    const groupId = req.body.groupUuid;
    try {
      await this.repositoryUserGroup.addUser(userId, groupId);
      res.status(200).json({});
    } catch (error) {
      Server.logger.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async removeUser(req : Request, res : Response) {
    const userId = req.params.id;
    const groupId = req.body.groupUuid;
    try {
      await this.repositoryUserGroup.removeUser(userId, groupId);
      res.status(200).json({});
    } catch (error) {
      Server.logger.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}