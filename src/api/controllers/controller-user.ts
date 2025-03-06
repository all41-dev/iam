import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite, Server } from "@all41-dev/server";
import { UserRepository } from "../../repositories/user-repository";

export class ControllerUser extends ControllerRepositoryReadWrite<UserRepository> {
  private userRepository: UserRepository;

  public constructor() {
    super();

    this.userRepository = new UserRepository();
  }

  public static create(): Router {
    return new ControllerUser().create(UserRepository);
  }


  public async setUserGroup(req: Request, res: Response) {
    const userId = req.params.id;
    const groupId = req.body.groupUuid;
    try {
      await this.userRepository.addGroup(userId, groupId);
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
      await this.userRepository.removeGroup(userId, groupId);
      res.status(200).json({});
    } catch (error) {
      Server.logger.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}