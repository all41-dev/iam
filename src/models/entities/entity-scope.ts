import { EntityRequest } from "@all41-dev/server";
import { DestroyOptions, FindOptions, WhereAttributeHash } from "sequelize";
import { ScopeTable } from "../../db/scope-table";
import { Scope } from "../../models/scope";

export class EntityScope<DbT extends ScopeTable, T extends Scope> extends EntityRequest<DbT, T> {
  public constructor(db?: new () => DbT) {
    super(db || ScopeTable as any, Scope as any);
  }

  public setFilter(criteria: WhereAttributeHash): void {
    this._findOptions.where = criteria;
  }

  public async getById(pk: string): Promise<T> {
    return this.dbFindByPk(pk).then((res) => {
      if (res) {
        return this.dbToClient(res);
      }
      throw new Error("Scope not found");
    });
  }

  public async getByGroup(groupUuid: string): Promise<T[]> {
    this.setFilter({ group_uuid: groupUuid });
    return this.get();
  }

  public async dbToClient(dbInst: DbT): Promise<T> {
    return this._dbToClient(dbInst);
  }

  public async clientToDb(clientObj: T): Promise<DbT> {
    return this._clientToDb(clientObj, ScopeTable);
  }

  public async preCreation(obj: T): Promise<T> {
    return obj;
  }

  public async preUpdate(obj: T): Promise<T> {
    return obj;
  }

  public async preDelete(id: number | string): Promise<number> {
    void id;
    return 0;
  }

  public async postCreation(obj: DbT): Promise<DbT> {
    return obj;
  }

  public setIncludes(): void {
    // Implement if needed
  }

  public async patch(params: { receivedObj: T; fields?: (keyof DbT)[]; keyValue: string }): Promise<T> {
    const existing = await this.getById(params.keyValue);
    const merged = { ...existing, ...params.receivedObj };
    const updatedClient = await this.preUpdate(merged);
    const dbInst = await this.clientToDb(updatedClient);
    await dbInst.save();
    return this.dbToClient(dbInst);
  }

  protected async dbFindAll(options: FindOptions): Promise<DbT[]> {
    return ScopeTable.findAll(options) as Promise<DbT[]>;
  }

  protected async dbFindByPk(pk: string): Promise<DbT | null> {
    return ScopeTable.findByPk(pk) as Promise<DbT | null>;
  }

  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return Promise.resolve(ScopeTable.destroy(options));
  }

  protected async _dbToClient(dbInst: DbT): Promise<T> {
    if (!dbInst.uuid) throw new Error("uuid is mandatory when retrieving from db");
    const res = Object.assign(new Scope({}), {
      uuid: dbInst.uuid,
      name: dbInst.name,
      parentUuid: dbInst.parent_uuid,
      parent: dbInst.parent,
      children: dbInst.children,
      userGroups: dbInst.user_groups,
      features: dbInst.features,
    });
    return res as T;
  }

  protected async _clientToDb(clientObj: T, db: typeof ScopeTable): Promise<DbT> {
    const obj = clientObj.uuid
      ? (await db.findOrBuild({ where: { uuid: clientObj.uuid.toString() } }))[0]
      : new db();
    obj.uuid = clientObj.uuid?.toString();
    obj.name = clientObj.name;
    obj.parent_uuid = clientObj.parentUuid;
    obj.parent = clientObj.parent;
    obj.children = clientObj.children;
    obj.user_groups = clientObj.userGroups;
    obj.features = clientObj.features;
    return obj as DbT;
  }
}