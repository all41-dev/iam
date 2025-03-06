import { RepositorySequelize } from "@all41-dev/server";
import { ScopeTable } from "../db/scope-table";

export class RepositoryScope extends RepositorySequelize<ScopeTable> {
  constructor(options?: { dbName?: string }) {
    super(ScopeTable, options?.dbName);
  }

  public async init() {
    return this;
  }
}
