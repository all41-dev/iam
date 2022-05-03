import { EntityRequest } from '@all41-dev/server';
import { SetPasswordToken } from '@all41-dev/iam.model';
import * as crypto from 'crypto';
import { Request } from 'express';
import * as NodeMailer from 'nodemailer';
import { FindOptions, DestroyOptions } from 'sequelize';
import * as Sequelize from 'sequelize';
import { DbSetPasswordToken } from '../db/db-set-password-token';
import { DbRessource } from '../db/db-ressource';

export class EntitySetPasswordToken extends EntityRequest<DbSetPasswordToken, SetPasswordToken> {
  public tokenDurationSec = 3600 * 24; // 1 day

  public constructor() {
    super(DbSetPasswordToken);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setIncludes(_includePaths: string[]): void {
    //
  }

  // noinspection JSMethodCanBeStatic
  public setFilter(req: Request): void {
    const filter: string | undefined = req.query.filter as string | undefined;
    if (filter !== undefined) {
      this._findOptions.where = {
        // Email: {[UsersApi.inst.sequelize.Op.like]: `%${filter}%`}
      };
    }
  }

  // noinspection JSMethodCanBeStatic
  public async dbToClient(inst: DbSetPasswordToken): Promise<SetPasswordToken> {
    return new SetPasswordToken({
      uuid: inst.uuid,
      idUser: inst.IdUser,
      message: inst.Message,
      expires: inst.Expires,
      tokenHash: inst.TokenHash,
    });
  }

  // noinspection JSMethodCanBeStatic
  public async clientToDb(clientObj: SetPasswordToken): Promise<DbSetPasswordToken> {
    const obj = clientObj.uuid ?
      (await DbSetPasswordToken.findOrBuild({ where: { uuid: clientObj.uuid } }))[0] :
      new DbSetPasswordToken();

    if (clientObj.uuid !== null) {
      obj.uuid = clientObj.uuid;
    }
    if (clientObj.idUser === undefined || clientObj.expires === undefined || clientObj.tokenHash === undefined) {
      throw new Error('invalid clientObj');
    }

    obj.IdUser = clientObj.idUser;
    obj.Message = clientObj.message === undefined ? '' : clientObj.message;
    obj.Expires = clientObj.expires;
    obj.TokenHash = clientObj.tokenHash;

    return obj;
  }

  public async preCreation(spt: SetPasswordToken): Promise<SetPasswordToken> {
    spt.tokenHash = crypto.randomBytes(64).toString('hex');

    const dt = new Date();
    dt.setSeconds(dt.getSeconds() + this.tokenDurationSec);
    spt.expires = dt;
    return spt;
  }
  public async postCreation(inst: DbSetPasswordToken): Promise<DbSetPasswordToken> {
    await this.notifyUser(inst);
    return inst;
  }

  public async preUpdate(user: SetPasswordToken): Promise<SetPasswordToken> {
    // console.info(user);
    // if (!EntityUser.emailIsValid(user.email)) {
    //     throw new Error(`The email address ${user.email} is not valid. Update has been canceled`);
    // }
    return user;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async preDelete(_id: number): Promise<number> {
    // throw new Error('not implemented yet');
    return 0;
  }

  /** @summary Creates a change password token
   * Considers that permission to create the token has been checked already
   * Verify existing token for the user
   * if exists then update validity
   * if not exists create (generate token value and store)
   * Send an email to the user with the token value
   * Wording of the email will change whether the token is for a new user or a lost password
   */
  public createSetPasswordToken = (userId: string, message: string): void => {
    DbSetPasswordToken.findAll({ where: { Expires: { [Sequelize.Op.lt]: new Date() } } })
      .then((spts: any) => {
        // delete expired tokens for all users
        for (const spt of spts) {
          spt.destroy();
        }

        let token: DbSetPasswordToken;
        // if(user.setPasswordTokens === undefined){
        //    user.setPasswordTokens = [];
        // }

        DbSetPasswordToken.findAll({ where: { IdUser: userId } }).then((spt: DbSetPasswordToken[]) => {
          if (spt !== null && spt !== undefined && spt.length > 0) {
            token = spt[0];
          } else {
            if (userId === undefined) {
              throw new Error('userId is missing');
            }

            const dt = new Date();
            dt.setSeconds(dt.getSeconds() + this.tokenDurationSec);
            token = {
              Expires: dt,
              IdUser: userId,
              Message: message,
              TokenHash: crypto.randomBytes(64).toString('hex'),
            } as DbSetPasswordToken;
          }

          DbSetPasswordToken.create(token).then((t) => this.notifyUser(t));
        });
      });
  }

  public notifyUser = async (t: DbSetPasswordToken): Promise<void> => {
    if (!t.IdUser) throw new Error('IdUser missing');
    // send email to user
    const user = await DbRessource.findOne({ where: { uuid: t.IdUser }});
    if (user === null) {
      throw new Error('user not found from setPasswordToken');
    }

    // const smtp = NodeMailer.createTransport({
    //   auth: {
    //     pass: process.env.SMTP_PASSWORD,
    //     user: 'bot@informaticon.com',
    //   },
    //   host: 'smtp-relay.gmail.com',
    //   port: 465, // 587,
    //   secure: true,
    // });
    // For execution outside of Informaticon's network
    const smtp = NodeMailer.createTransport({
      auth: {
        pass: process.env.SMTP_PASSWORD,
        user: 'app@harps.ch',
      },
      host: 'mail.infomaniak.com',
      port: 587,
      secure: false,
    });

    // to be configured with env var
    // const baseUrl = 'localhost:3020/iam';
    const link = `${process.env.OAUTH_ROOT_URL}/change-password/${t.TokenHash}`;

    return smtp.sendMail({
      from: 'no-reply@harps.ch',
      html: `<strong>${t.Message}</strong><br><a href="${link}">change your password</a>`,
      subject: 'Change your password',
      text: `${t.Message}\n${link}`,
      to: user.email,
    });
  }

  protected async dbFindByPk(pk: string): Promise<DbSetPasswordToken|null> {
    return DbSetPasswordToken.findByPk(pk);
  }

  protected async dbFindAll(options: FindOptions): Promise<DbSetPasswordToken[]> {
    return DbSetPasswordToken.findAll(options);
  }
  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return Promise.resolve(DbSetPasswordToken.destroy(options));
  }
}
