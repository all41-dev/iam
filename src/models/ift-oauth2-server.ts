import * as Bcrypt from 'bcrypt';
import ExpressOAuthServer = require('express-oauth-server');
import * as Jwt from 'jsonwebtoken';
import { AuthorizationCode, Client, Falsey, Token, User } from 'oauth2-server';
import { Op } from 'sequelize';
import { IdentityApi } from '../api';
import { DbAccessToken } from './db/db-access-token';
import { DbRessource } from './db/db-ressource';
import { DbScope } from './db/db-scope';

export class HarpsOAuth2Server {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public static getInstance(options: any): ExpressOAuthServer {
    const opt = options === undefined ? {} : options;
    opt.model = {
      getAccessToken: (accessToken: string): any => {
        // console.info('In getAccessToken OAuth method');

        const resp = DbAccessToken.findOne({
          include: [DbRessource],
          where: {
            tokenValue: accessToken,
          },
        }).then((inst: DbAccessToken|null) => {
          if (!inst) {
            throw new Error('user not found 1');
          }
          const token: DbAccessToken = inst;


          const obj = {
            accessToken: token.tokenValue,
            accessTokenExpiresAt: token.expiresAt,
            client: token.client,
            scope: token.scopes,
            user: token.user,
          };

          return obj;
        }); // .catch(() => {console.info('error (harps)')});

        // console.info('ready to return promise');
        return resp;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getClient: (clientId: string, _clientSecret: string): Promise<Client | Falsey> | any => {
        // console.info('In getClient OAuth method');

        const resp = DbRessource.findOne({
          where: {
            uuid: clientId,
            // For mobile and native apps only, not used yet
            // ClientSecret: clientSecret
          },
        }).then((inst: DbRessource|null) => {
          if (!inst) {
            throw new Error('client not found');
          }
          const client: DbRessource = inst;

          const obj = {
            // client_id: client.ClientId,
            client_name: client.name,
            grants: ['password'],
            id: client.uuid,
            redirectUris: client.redirectUris,
            // accessTokenLifetime: 3600,
            // grants: ['authorization_code', 'password', 'refresh_token', 'client_credentials'], // ['password', 'client_credentials'],
            // refreshTokenLifetime: 3600 * 24,
            // redirectUris: 'http://localhost:1234',
            // // added, probably not required
            // name: 'foo',
            // client_id: clientId,
            // client_secret: 'sldslkd',
            // grant_types: 'dsldksdl',
            // scope: 'sdddd'
          };

          return obj;
        }); // .catch(() => {console.info('error (harps)')});

        // console.info('ready to return promise');
        return resp;
      },
      saveToken: (token: Token, client: Client, user: User): any => {
        // console.info('In saveToken OAuth method');
        const resp = DbAccessToken.findOne({
          // include: [
          //   { model: DbRessource, foreignKey: 'IdClient', through},
          //   { model: DbRessource, foreignKey: 'IdUser'},
          // ],
          where: {
            tokenValue: token.accessToken,
          },
        }).then(async (inst: DbAccessToken|null) => {
          let t: DbAccessToken;
          if (!inst) {
            const dbClientInst = await DbRessource.findOne({
              where: { uuid: client.id },
            });
            if (!dbClientInst) {
              throw new Error(`client '${client.id}' not found`);
            }
            const dbClient: DbRessource = dbClientInst;
            if (!dbClient.uuid) { throw new Error('Missing Id'); }

            // Clean expired tokens for the user
            await DbAccessToken.destroy({
              where: { idClient: dbClient.uuid, idUser: user.id, expiresAt: { [Op.lt]: new Date() } },
            });

            // token not found -> create
            t = await DbAccessToken.create({
              expiresAt: token.accessTokenExpiresAt === undefined ? new Date() : token.accessTokenExpiresAt,
              idClient: dbClient.uuid,
              idUser: user.id,
              scopes: token.scope === undefined ? '' : Array.isArray(token.scope) ? token.scope.join('|') : token.scope,
              tokenValue: token.accessToken,
            } as DbAccessToken);
          } else { t = inst; }

          const obj = {
            accessToken: t.tokenValue,
            accessTokenExpiresAt: t.expiresAt,
            scope: t.scopes,
            // tslint:disable-next-line: object-literal-sort-keys
            client,
            user,
            Client: client,
            User: user,
            id_token: undefined,
          };
          if (IdentityApi.req === undefined || IdentityApi.req.body.nonce === undefined) {
            throw new Error('request or nonce value is not defined');
          }

          obj.id_token = await HarpsOAuth2Server.getIdToken(obj, IdentityApi.req.body.nonce);

          return obj;
        }); // .catch(() => {console.info('error (harps)')});

        return resp;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      verifyScope: (_token: Token, _scope: string | string[]): Promise<boolean> => {
        // console.info('In verifyScope OAuth method');
        // todo: next
        return new Promise<boolean>(() => {
          return Promise.resolve(false);
        });
      },
      // optional, see -> https://oauth2-server.readthedocs.io/en/latest/model/spec.html#generateaccesstoken-client-user-scope-callback
      // generateAccessToken: (client: Client, user: User, scope: string|string[]): any => {
      //     console.info('In generateAccessToken OAuth method');
      //
      //     const model = UsersController.getModel();
      //
      //     const resp = model.findOne({
      //         where: {
      //             Email: 'eric@youri.ch'
      //         }
      //     }).then((inst) => {
      //         let user: User;
      //
      //         if (!inst || !(user = inst.get()))
      //             throw new Error('user not found');
      //
      //         const obj: string = 'access-token-value';
      //
      //         return obj;
      //     });// .catch(() => {console.info('error (harps)')});
      //
      //     return resp;
      // },
      // optional, see -> https://oauth2-server.readthedocs.io/en/latest/model/spec.html#generaterefreshtoken-client-user-scope-callback
      // generateRefreshToken: (client: Client, user: User, scope: string|string[]) => {
      //     console.info('In generateRefreshToken OAuth method');
      //     return new Promise<string>(() => {
      //         return Promise.resolve('');
      //     });
      // },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      generateAuthorizationCode: (_client: Client, _user: User, _scope: string | string[]) => {
        // console.info('In generateAuthorizationCode OAuth method');
        return new Promise<string>(() => {
          return Promise.resolve('');
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getAuthorizationCode: (_authorizationCode: string) => {
        // console.info('In getAuthorizationCode OAuth method');
        return new Promise<AuthorizationCode | Falsey>(() => {
          return Promise.resolve('');
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      saveAuthorizationCode: (_code: AuthorizationCode, _client: Client, _user: User) => {
        // console.info('In saveAuthorizationCode OAuth method');
        return new Promise<AuthorizationCode | Falsey>(() => {
          return Promise.resolve('');
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      revokeAuthorizationCode: (_code: AuthorizationCode) => {
        // console.info('In revokeAuthorizationCode OAuth method');
        return new Promise<boolean>(() => {
          return Promise.resolve(false);
        });
      },
      // optional, see -> https://oauth2-server.readthedocs.io/en/latest/model/spec.html#validatescope-user-client-scope-callback
      // validateScope: (user: User, client: Client, scope: string|string[]) => {
      //     console.info('In validateScope OAuth method');
      //     return new Promise<string|string[]|Falsey>(() => {
      //         return Promise.resolve('');
      //     });
      // },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getUserFromClient: (_client: Client): Promise<User|Falsey> => {
        // console.info('In getUserFromClient OAuth method');
        return new Promise<User | Falsey>(() => {
          return Promise.resolve('');
        });
      },
      getUser: (username: string, password: string): Promise<User> => {
        // console.info('In getUser OAuth method');

        const resp = DbRessource.findOne({
          where: {
            email: username,
          },
        }).then((user) => {

          if (!user) {
            throw new Error('user not found');
          }
          if (!user.salt) {
            throw new Error('salt missing');
          }

          const hash = Bcrypt.hashSync(password, user.salt);
          if (hash !== user.hash) {
            throw new Error('bad password');
          }

          const obj: User = {
            id: user.uuid,
            username: user.email,
          };

          return obj;
        }); // .catch(() => {console.info('error (harps)')});

        return resp;
      },
    };
    return new ExpressOAuthServer(opt);
  }

  public static async getIdToken(token: Token, nonce: string): Promise<any> {
    try {

      const userscope: string = await HarpsOAuth2Server.getUserScopes(token.user.username);
      const host = IdentityApi.req.headers.host;
      // const protocol = !host || host.startsWith('localhost') ? 'http' : 'https';
      const referer = IdentityApi.req.headers.referer;
      const protocol = referer ? referer.substr(0, referer.indexOf('://')) : 'http';
      const clientUrl = `${protocol}://${host}/iam`;

      return Jwt.sign({
        iss: clientUrl, // 'http://localhost:3000', // issuer -> OAuth server (this)
        // tslint:disable-next-line: object-literal-sort-keys
        cid: clientUrl, // 'http://localhost:3000', // granted api
        aud: token.client.id,
        sub: token.user.id,
        username: token.user.username,
        at_hash: token.accessToken,
        // jti: nonce,
        nonce,
        // tslint:disable-next-line: max-line-length
        scope: userscope, // 'Access/Read+Microservices/Users;Access+Microservices/Users/Users;Access/Read|Send+Microservices/Users/SetPasswordTokens|Tokens'
      }, '-----BEGIN RSA PRIVATE KEY-----\n' +
      'MIIEowIBAAKCAQEAsphx6KhpetKXk/oR8vrDxwN8aaLsiBsYNvrWCA9oDcubuDD/\n' +
      'YLnXH65QnNoRdlOW0+dCAStZVB3VtHR9qyUbqCvS443xC59nDrEHEpTO8+zeHzkk\n' +
      'Ip4zVU0vvowZlkVqZZA032dCEaB4LSIzZoxWa1OHSfmQgR90zMVDCI98YCNvTGrd\n' +
      'J66GrYRVdjnd5Jg5ebZVtfa9VMN1WBro02pLJ8K/cux/i7KO0zovDYhID90wNU/q\n' +
      '8F1nzlDcs5TiPPBBTNWfGLMRVec2xbIpQ9T3Ou0Yn4xPUimwVRSrvkcCF1MTbm55\n' +
      '/Jv9EdRbrVk46n3qZMbx0cHDGCUjaAcKbkVkcQIDAQABAoIBAAHUG751Evdl9pVW\n' +
      'Rx7EwIJmH7z5JRDTrjDJ6q0Uc01I22RMZCD6ZiB16W9hsDIU8wNiZ8OZTQXWdFyv\n' +
      'oKXC8ICNSlB4IJKs5CI7X8Yp7eCDeVa6gAs2sXHbI3UA/DYUqd02V8Q9y2hgyzoz\n' +
      'EnGnWC8rIMR6IKehydFa56/LwEs/rT/qyB3BwI8BC0pfQu/WONR9ufGeZ2RdGIte\n' +
      'SBWZ+59pIhVIRTvw04hpFiE78gxy/w3SSn0lESNODNorP3H5xsv8Fm10ZLVGWGHq\n' +
      'o/Y+8J+7DVvYesGzY/qcvodyKp80CIGu+kfRah/ELosI1O4RPpRREXJ/e/NweIAM\n' +
      'wc7WnAECgYEA2i0SugRnjWSzde7P0WoSApIg2CxkIMNNezAgp8P8lDre+x5W+lml\n' +
      '4BYdNlOUQFtD9IkdlH0NW+J+lK1Z2WJ3hoqUd71iKOHDYcsCspVI0vVewAUjQdn9\n' +
      'E2GjKbzRAEC5pT9z8QZVQeNFoi+5bec+PyUm6vFPsSqzyL8tI3BvkbECgYEA0Y68\n' +
      'dt3kCioQeYEZbhw6a0hHHOGSOdfbHXXfwa1aK+bg6GqTzBPi6owK1YET+EtIKKqJ\n' +
      '+Ax4wuiyjiPzdL0Ci4qYvv6sytJa5s+Qm1njLY3JcpXk0R7XqAOSpWodFkye4eRl\n' +
      'wYFEFSbPdwYQvI2siXXveR3lf9Wgr4o7PoOW7sECgYApbT2NDKEM+/4Hep0DSny4\n' +
      '+D48TdGFVxAzP+QzdsdS7grA6/Xf+32/mvNZCW2w+qNgn1h6hXQv6kXWvUO+PzAq\n' +
      '381pHxCwao3K191fQ3FcfTLMiy0yp82iDHwKxMt6nM+jTPUa4vT1Wc4zCZTQBYSQ\n' +
      'QOGu4rsbDNyuVX6gqAzHQQKBgB/YJ+2MRIYC5GQCaUHhSkNZRW0vHhBqK+LrMah1\n' +
      '1lkLiavn3jPJ5dasl0zgg49cqUd8uuCVzJgZ0mBlOC7KNiPMWO/VNZ7Qnn2qlxf0\n' +
      'beBTRoSCILZikHT4rgUy/d6QoChFk+z23si0EBzPMCXnBYwR/uUR1Pk7FmL2h5A1\n' +
      'YO9BAoGBAJFE2g4unWFbJHi+XEXl7MHfrx4nEVrD6NKWSxLOoS4YEmJmdnmVQ8qy\n' +
      'YWz+7C0Jxb7m2c+TWWvsmMDfSXiVammCke2kf6FYp+7ZmGo/eFStaSuZ/VY05uQ1\n' +
      'xunvG66XSKQwIIU61jf35Ltj+RLhsBkOgYxdwa4ADQ6/znXI7JzU\n' +
        '-----END RSA PRIVATE KEY-----', {
        algorithm: 'RS256',
        keyid: '4129db2ea1860d2e871ee48506287fb05b04ca3f',
      });
    } catch (ex) {
      // console.error(ex.toString());
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public static async getUserScopes(username: string, _requiredScopes?: string): Promise<string> {
    return DbRessource.findOne({where: {email: username}}).then(async (user: DbRessource|null) => {
      if (!user) { throw new Error('User not found'); }

      const scopeUuids = user.scopeUuids ? user.scopeUuids.split(' ') : [];
      const res = await DbScope.findAll({where: { uuid: {[Op.in]: scopeUuids}}}).then((scopes: DbScope[]) => scopes.map((scope) => scope.ressourcePaths).join(' '));
      return res;
    })
  }
  // public static getUserScope(mail: string): Promise<string> {
  //   return new Promise((resolve, reject) => {
  //     // console.log('/n/n/n mail:' + mail + '/n/n/n');
  //     const xhr = new XMLHttpRequest();
  //     // xhr.open('get', `${IdentityApi.accessMsRootUrl}/api/users/${mail}/permissions`, true);
  //     xhr.open('get', `/api/users/${mail}/permissions`, true);
  //     xhr.onload = () => {
  //       if (xhr.status !== 200) {
  //         reject(xhr.statusText);
  //       } else {
  //         resolve(xhr.responseText);
  //       }

  //     };
  //     xhr.onerror = () => reject(xhr.statusText);
  //     xhr.ontimeout = () => reject(xhr.statusText);
  //     xhr.send();
  //   });
  // }
}
