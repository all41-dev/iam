import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite, Server } from "@all41-dev/server";
import { AuthUserRepository } from "../../repositories/auth-user-repository";

export class ControllerAuthUser extends ControllerRepositoryReadWrite<AuthUserRepository> {
  private userRepository: AuthUserRepository;

  public constructor() {
    super();

    this.userRepository = new AuthUserRepository();
  }

  public static create(): Router {
    return new ControllerAuthUser().create(AuthUserRepository);
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