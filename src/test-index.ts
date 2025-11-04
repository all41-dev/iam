import { IDbOptions } from "@all41-dev/db-tools";
import { IServerOptions } from "@all41-dev/server";
import { IamDb } from "./db/iam-db";
import path from "path";
import { TestServer } from "./test-server";
import { IamApi } from "./api/iam-api";
import { Response } from "express";
import { readFileSync } from "fs";

import { Strategy as GitHubStrategy } from "passport-github2";
import { scopeElementAncestor, scopeElementHierarchy } from "./utils/scope-element-dummy";
import { AuthUtils } from "./auth/auth-utils";

const dbOptions: IDbOptions<any> = {
  engine: 'mariadb',
  username: process.env.DB_USERNAME || 'root',
  hostname: process.env.DB_HOST,
  password: process.env.DB_PASSWORD || 'root',
  dbName: process.env.DB_NAME || 'iam',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  multipleStatements: true,
  type: IamDb,
  dbTools: {
    app: 'iam',
    updateOnStartup: true,
    scriptsFolder: path.resolve(`${__dirname}/db/scripts`)
  }
};

const privateKey = readFileSync(path.resolve(`${__dirname}/../keys/private.pem`), 'utf8');
const publicKey = readFileSync(path.resolve(`${__dirname}/../keys/public.pem`), 'utf8');
const authUtils = AuthUtils.getInstance({ scopeElementAncestor, scopeElementHierarchy })

const options: IServerOptions = {
  dbs: dbOptions,
  httpPort: process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 7070,
  auth: {
    masterApiKey: process.env.MASTER_API_KEY,
    redirectAfterLogin: process.env.REDIRECT_URL,
    redirectAfterLogout: process.env.REDIRECT_URL,
    privateKey: privateKey,
    publicKey: publicKey,
    strategies: {
      github: new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: process.env.GITHUB_CALLBACK_URL!,
        scope: ['user:email', 'read:user'],
      }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
          const { user, error } = await authUtils.checkUser(profile, 'github');
          return done(null, user, error ? { message: error } : undefined);
        } catch (e) {
          return done(e);
        }
      }),
    },
  },
  apis: {
    type: IamApi,
    requireAuth: !(process.env.DISABLE_AUTH === 'true'),
    baseRoute: '/api'
  },
  statics: [{
    baseRoute: '/front/',
    ressourcePath: `${__dirname}/../node_modules/@all41-dev/iam.front/www/front`,
    getRoutes: [{
      path: '/*',
      handler: (_req: any, res: Response) => {
        res.sendFile(path.resolve(`${__dirname}/../node_modules/@all41-dev/iam.front/www/front/index.html`), { dotfiles: "allow" });
      },
    }],
  }],
};

const server = new TestServer(options);
server.start();