import { EntityRequest } from '@all41-dev/server';
import { User } from '@all41-dev/iam.model';
import { Response } from 'express';
import { DestroyOptions, FindOptions, Op } from 'sequelize';
import { DbSetPasswordToken } from '../db/db-set-password-token';
import { DbRessource } from '../db/db-ressource';
import { EntitySetPasswordToken } from './entity-set-password-token';

export class EntityUser extends EntityRequest<DbRessource, User> {
  public constructor() {
    super(DbRessource);
  }
  public static emailIsValid = (email: string | undefined): boolean => {
    // tslint:disable-next-line: max-line-length
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return email === undefined ? false : re.test(email);
  }

  public static async userExists(email: string | undefined): Promise<boolean> {
    if (email === undefined) {
      throw new Error('No email address provided (undefined)');
    }
    const options: any = {
      where: {
        email,
      },
    };
    // TODO check if this works
    const res = await DbRessource.count(options).then((nb) => (nb as any) > 0);
    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setIncludes(_includePaths: undefined | string | string[] | any): void {
    //
  }

  public setFilter(filter?: string): void {
    // const filter: string | undefined = req.query.filter;
    if (filter) {
      this._findOptions.where = {
        Email: {
          [Op.and]: {
            [Op.like]: `%${filter}%`,
            [Op.ne]: null,
          }
        },
      };
    } else { 
      this._findOptions.where = {
        Email: {[Op.ne]: null,}
      }}
  }

  public async dbToClient(dbInst: DbRessource): Promise<User> {
    return new User({
      uuid: dbInst.uuid,
      email: dbInst.email,
      name: dbInst.name,
      scopeUuids: dbInst.scopeUuids,
    });
  }

  public async clientToDb(clientObj: User): Promise<DbRessource> {
    const obj = clientObj.uuid ?
      (await DbRessource.findOrBuild({ where: { uuid: clientObj.uuid } }))[0]:
      new DbRessource();

    if (!clientObj.email) { throw new Error('email must be set'); }
    obj.email = clientObj.email;
    obj.path = `/root/users/${clientObj.email}`;
    obj.scopeUuids = clientObj.scopeUuids;
    obj.name = clientObj.name;

    // Set through the password update process
    // obj.Hash = "hashvalue";
    // obj.Salt = "saltvalue";

    return obj;
  }

  public async preCreation(user: User): Promise<User> {
    if (!EntityUser.emailIsValid(user.email)) {
      throw new Error(`The email address ${user.email} is not valid. Creation has been canceled`);
    }

    await EntityUser.userExists(user.email).then((exists: boolean) => {
      if (exists) {
        throw new Error(`The user ${user.email} already exists. Creation has been canceled.`);
      }

      // Email is valid and doesn't exists yet
    }).catch((e) => {
      throw e;
    });
    return user;
  }
  public async postCreation(user: DbRessource): Promise<DbRessource> {
    if (user.uuid === undefined) {
      throw new Error('Db user without Id');
    }
    new EntitySetPasswordToken().createSetPasswordToken(user.uuid, 'Your account has been created, please set your password to enable it.');
    return user;
  }

  public async preUpdate(user: User): Promise<User> {
    // console.info(user);
    if (!EntityUser.emailIsValid(user.email)) {
      throw new Error(`The email address ${user.email} is not valid. Update has been canceled`);
    }
    return user;
  }

  public async preDelete(id: number): Promise<number> {
    const options: DestroyOptions = { where: { IdUser: id } };
    return DbSetPasswordToken.destroy(options);
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public async getByPk(pk: any): Promise<User> {
    return this.dbFindByPk(pk).then((res) => {
      if (res) {
        return this.dbToClient(res)
      }
      throw new Error('User not found');
    })
  }
  public doGetFromToken(options: FindOptions, res: Response): void {
    DbSetPasswordToken.findOne(options).then(async (spt: DbSetPasswordToken | null) => {
      const token = spt as DbSetPasswordToken;
      if (token === null) {
        // res.statusCode = 500;
        // res.statusMessage = 'The provided token is not valid.';
        res.json('The provided token is not valid.');
      } else {
        if(!token.User) {throw new Error('User not set in token, include was probably missing in query'); }
        const usr = token.User
        res.json([await this.dbToClient(usr)]);
      }
    });
  }
  protected async dbFindByPk(pk: string): Promise<DbRessource|null> {
    return DbRessource.findByPk(pk);
  }

  protected async dbFindAll(options: FindOptions): Promise<DbRessource[]> {
    return DbRessource.findAll(options);
  }
  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return Promise.resolve(DbRessource.destroy(options));
  }
}
