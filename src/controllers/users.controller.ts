import { ControllerBase } from '@all41-dev/server';
import * as Bcrypt from 'bcrypt';
import { NextFunction, Request, Response, Router } from 'express';
import { FindOptions } from 'sequelize';
import { IdentityApi } from '../api';
import { EntitySetPasswordToken } from '../models/business/entity-set-password-token';
import { EntityUser } from '../models/business/entity-user';
import { DbSetPasswordToken } from '../models/db/db-set-password-token';
import { DbRessource } from '../models/db/db-ressource';
import { HarpsOAuth2Server } from '../models/ift-oauth2-server';

export class UsersController extends ControllerBase {
  public static create(): Router {
    const router = Router();

    router.get('/', UsersController.checkAccess(['/root']), UsersController.getAll);
    router.get('/:id', UsersController.checkAccess(['/root']), UsersController.getById);
    router.get('/from-token/:token', UsersController.getFromToken);
    router.post('/authenticate', UsersController.authenticate);
    router.patch('/change-password/:token', UsersController.changePassword);
    router.post('/', UsersController.checkAccess(['/root']), UsersController.post);
    router.patch('/:id', UsersController.checkAccess(['/root']), UsersController.update);
    router.delete('/:id', UsersController.checkAccess(['/root']), UsersController.remove);
    router.post('/lost-password/:email', UsersController.lostPassword);

    return router;
  }

  public static getAll(req: Request, res: Response): void {
    // Since here, the user is considered as authorized
    const entity = new EntityUser();

    // if (req.query.filter && typeof req.query.filter === 'string')
    entity.setFilter(req.query.filter as any);
    
    if (req.query.include && (typeof req.query.include === 'string' || (Array.isArray(req.query.include))))
      entity.setIncludes(req.query.include);

    entity.get().then((data): void => {
      res.json(data);
    }, (reason): void => {
      res.status(500);
      res.json(reason);
    });
  }

  // noinspection JSUnusedLocalSymbols
  public static getById(req: Request, res: Response): void {
    const entity = new EntityUser();

    if (req.query.include && (typeof req.query.include === 'string' || (Array.isArray(req.query.include))))
      entity.setIncludes(req.query.include);

    entity.getByPk(req.params.id).then((data): void => {
      res.json(data);
    }, (reason): void => {
      res.status(500);
      res.json(reason);
    });
  }

  // noinspection JSUnusedLocalSymbols
  public static getFromToken(req: Request, res: Response): void {
    const entity = new EntityUser();

    const token = req.params.token;
    if (token === undefined) {
      throw new Error('Token is not set');
    }

    const options: FindOptions = {
      where: {
        TokenHash: token,
      },
      include: [DbRessource],
    };

    entity.doGetFromToken(options, res);
  }

  public static authenticate(req: Request, res: Response, next: NextFunction): void {
    IdentityApi.req = req;
    IdentityApi.res = res;

    const oauthSrv = HarpsOAuth2Server.getInstance({
      allowExtendedTokenAttributes: true,
      requireClientAuthentication: { password: false },
    });
    oauthSrv.token()(req, res, next);
  }

  public static changePassword(req: Request, res: Response): void {
    const token = req.params.token;
    const options: FindOptions = {
      where: {
        TokenHash: token,
      },
      include: [DbRessource],
    };
    DbSetPasswordToken.findOne(options).then(async (spt: DbSetPasswordToken | null) => {
      const inst = spt as DbSetPasswordToken;
      const user = inst.User;
      if (!user) {
        throw new Error('user id null');
      }

      const salt = Bcrypt.genSaltSync(10);
      const hash = Bcrypt.hashSync(req.body.password, salt);
      user.update({
        hash: hash,
        salt: salt,
      }).then(() => {
        if (spt === null) {
          throw new Error('setPasswordToken is null');
        }
        spt.destroy().then(() => {
          const eu = new EntityUser();
          res.json(eu.dbToClient(user));
        });
      });
    });
  }

  public static post(req: Request, res: Response): void {
    const entity = new EntityUser();

    entity.post(req.body).then((data): void => {
      res.json(data);
    }, (reason): void => {
      res.status(500);
      res.json(reason);
    });
  }

  public static update(req: Request, res: Response): void {
    const entity = new EntityUser();
    if (!req.params.id || !parseInt(req.params.id)) { throw new Error('number id parameter must be provided when updating an exchange'); }

    entity.put(req.body).then((data): void => {
      res.json(data);
    }, (reason): void => {
      res.status(500);
      res.json(reason);
    });
  }

  public static remove(req: Request, res: Response): void {
    const entity = new EntityUser();

    try {
      entity.del(req.params.id, 'uuid');
    } catch (e) {
      const err = e as Error;
      res.statusCode = 400;
      res.send({ message: err.message });
    }
  }

  public static async lostPassword(req: Request, res: Response): Promise<void> {
    const email: string = req.body.email.toLowerCase();

    if (!EntityUser.emailIsValid(email)) {
      res.statusCode = 400;
      res.send({ message: `The email address ${email} is not valid. The request has been canceled` });
      return;
    }
    if (!await EntityUser.userExists(email)) {
      res.statusCode = 409;
      res.send({ message: `The user ${email} already exists. The request has been canceled.` });
      return;
    }

    DbRessource.findOne({
      where: {
        email,
      },
    }).then((user: DbRessource|null) => {
      if (!user || user.uuid === undefined) {
        throw new Error('user not found');
      }
      const eu = new EntitySetPasswordToken();

      // tslint:disable-next-line: max-line-length
      eu.createSetPasswordToken(user.uuid, 'You have requested to reset you password for Informaticon Devops, please click the link below to proceed. If you didn\'t request this, you can ignore this e-mail.');
    });
  }
}
