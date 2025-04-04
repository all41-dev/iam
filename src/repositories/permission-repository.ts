import { RepositorySequelize } from "@all41-dev/server.types";
import { PermissionTable } from "../db/permission-table";
export class RepositoryPermission extends RepositorySequelize<PermissionTable> {
  constructor() {
    super(PermissionTable);
  }

  public async init() {
    return this;
  }
}