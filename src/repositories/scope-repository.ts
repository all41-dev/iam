import { RepositorySequelize } from "@all41-dev/server.types";
import { ScopeTable } from "../db/scope-table";
import { Repository as SequelizeNativeRepository } from "sequelize-typescript";

export class RepositoryScope extends RepositorySequelize<ScopeTable> {
  constructor(repository: SequelizeNativeRepository<ScopeTable>) {
    super(ScopeTable, repository);
  }

  public async init() {
    return this;
  }
}
