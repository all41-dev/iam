import { Router, Request, Response } from "express";
import { ControllerRepositoryReadWrite } from "@all41-dev/server.types";
import { RepositoryAuthUser } from "../../repositories/auth-user-repository";
import { AuthUserTable } from "../../db/auth-user-table";

export class ControllerAuthUser extends ControllerRepositoryReadWrite<RepositoryAuthUser> {
  private repositoryAuthUser: RepositoryAuthUser;

  constructor() {
    const repositoryAuthUser = new RepositoryAuthUser(AuthUserTable);

    super();

    this.repositoryAuthUser = repositoryAuthUser;

    this.setUserGroup = this.setUserGroup.bind(this);
    this.unsetUserGroup = this.unsetUserGroup.bind(this);

    this.defineRoutes(
      { verb: 'patch', path: '/set-group/:id', handlers: this.setUserGroup },
      { verb: 'patch', path: '/unset-group/:id', handlers: this.unsetUserGroup },
    );
  }

  public static create(): Router {
    const controller = new ControllerAuthUser();
    return controller.create(controller.repositoryAuthUser);
  }


  public async setUserGroup(req: Request, res: Response) {
    const userUuid = req.params.id;
    const groupUuid = req.body.groupUuid;
    try {
      await this.repositoryAuthUser.addGroup(userUuid, groupUuid);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async unsetUserGroup(req: Request, res: Response) {
    const userUuid = req.params.id;
    const groupUuid = req.body.groupUuid;
    try {
      await this.repositoryAuthUser.removeGroup(userUuid, groupUuid);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

}