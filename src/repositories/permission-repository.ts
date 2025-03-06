import { RepositorySequelize } from "@all41-dev/server";
import { PermissionTable } from "../db/permission-table";

export class RepositoryPermission extends RepositorySequelize<PermissionTable> {
  constructor(options?: { dbName?: string }) {
    super(PermissionTable, options?.dbName);
  }

  public async init() {
    return this;
  }
}