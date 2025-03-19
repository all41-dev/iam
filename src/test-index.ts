import { IDbOptions } from "@all41-dev/db-tools";
import { IServerOptions } from "@all41-dev/server";
import { IamDb } from "./db/IamDb";
import path from "path";
import { TestServer } from "./test-server";
import { IamApi } from "./api/iam-api";
import { Response } from "express";

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

const options: IServerOptions = {
  dbs: [dbOptions],
  httpPort: process.env.PORT ? parseInt(process.env.PORT) : 7000,
  apis: {
    type: IamApi,
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