import { ControllerRepositoryReadWrite, Server } from "@all41-dev/server";
import { RepositoryUser } from "../repositories/repository-user";
import { Router, Request, Response } from "express";

export class ControllerUser extends ControllerRepositoryReadWrite<RepositoryUser> {
  private repositoryUser: RepositoryUser;

  constructor() {
    super();
    this.repositoryUser = new RepositoryUser();
  }

  public static create(): Router {
    return new ControllerUser().create(RepositoryUser);
  }

  public async setUserGroup(req: Request, res: Response) {
    const userId = req.params.id;
    const groupId = req.body.groupUuid;
    try {
      await this.repositoryUser.addGroup(userId, groupId);
      res.status(200).json({});
    } catch (error) {
      Server.logger.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async unsetUserGroup(req: Request, res: Response) {
    const userId = req.params.id;
    const groupId = req.body.groupUuid;
    try {
      await this.repositoryUser.removeGroup(userId, groupId); 
      res.status(200).json({});
    } catch (error) {
      Server.logger.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
    
}