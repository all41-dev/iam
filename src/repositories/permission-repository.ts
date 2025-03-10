import { RepositorySequelize } from "@all41-dev/server.types";
import { PermissionTable } from "../db/permission-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";
export class RepositoryPermission extends RepositorySequelize<PermissionTable> {
  constructor(repository: SequelizeNativeRepository<PermissionTable>) {
    super(PermissionTable, repository);
  }

  public async init() {
    return this;
  }
}