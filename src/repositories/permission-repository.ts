import { RepositorySequelize } from "@all41-dev/server.types";
import { DbPermission } from "../db/db-permission";
export class RepositoryPermission extends RepositorySequelize<DbPermission> {
  constructor() {
    super(DbPermission);
  }

  public async init() {
    return this;
  }
}