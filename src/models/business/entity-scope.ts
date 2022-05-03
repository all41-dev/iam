import { DbScope } from "../db/db-scope";
import { Scope } from "@all41-dev/iam.model";
import { EntityRequest } from "@all41-dev/server";
import { FindOptions, DestroyOptions } from "sequelize/types";

export class EntityScope extends EntityRequest<DbScope, Scope> {
  public constructor() {
    super(DbScope);
  }
  async dbToClient(dbObj: DbScope): Promise<Scope> {
    const res = new Scope({
      name: dbObj.name,
      uuid: dbObj.uuid,
      ressourcePaths: dbObj.ressourcePaths
    });
    return res;
  }
  async clientToDb(clientObj: Scope): Promise<DbScope> {
    const obj = clientObj.uuid ?
      (await DbScope.findOrBuild({ where: { uuid: clientObj.uuid } }))[0] :
      new DbScope();
    obj.uuid = clientObj.uuid;
    obj.name = clientObj.name;
    obj.ressourcePaths = clientObj.ressourcePaths;
    return obj;
  }
  setFilter(opt: any): void {
    // nothing to do
    // throw new Error("Method not implemented.");
  }
  async preCreation(obj: Scope): Promise<Scope> {
    return obj;
  }
  async preUpdate(obj: Scope): Promise<Scope> {
    return obj;
  }
  async preDelete(id: string | number): Promise<number> {
    return 0;
  }
  async postCreation(obj: DbScope): Promise<DbScope> {
    return obj;
  }
  setIncludes(includePaths: string[]): void {
    return;
  }
  protected dbFindAll(options: FindOptions): Promise<DbScope[]> {
    return DbScope.findAll(options);
  }
  protected dbFindByPk(pk: string): Promise<DbScope | null> {
    return DbScope.findByPk(pk);
  }
  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return DbScope.destroy(options);
  }
}