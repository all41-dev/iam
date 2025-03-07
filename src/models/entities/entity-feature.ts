import { EntityRequest } from "@all41-dev/server";
import { DestroyOptions, FindOptions, WhereAttributeHash } from "sequelize";
import { FeatureTable } from "../../db/feature-table";
import { Feature } from "../../models/feature";

export class EntityFeature<DbT extends FeatureTable, T extends Feature> extends EntityRequest<DbT, T> {
  public constructor(db?: new () => DbT) {
    super(db || FeatureTable as any, Feature as any);
  }

  public setFilter(criteria: WhereAttributeHash): void {
    this._findOptions.where = criteria;
  }

  public async getById(pk: string): Promise<T> {
    return this.dbFindByPk(pk).then((res) => {
      if (res) {
        return this.dbToClient(res);
      }
      throw new Error("Feature not found");
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
    return this._clientToDb(clientObj, FeatureTable);
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
    return FeatureTable.findAll(options) as Promise<DbT[]>;
  }

  protected async dbFindByPk(pk: string): Promise<DbT | null> {
    return FeatureTable.findByPk(pk) as Promise<DbT | null>;
  }

  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return Promise.resolve(FeatureTable.destroy(options));
  }

  protected async _dbToClient(dbInst: DbT): Promise<T> {
    if (!dbInst.uuid) throw new Error("uuid is mandatory when retrieving from db");
    const res = Object.assign(new Feature({}), {
      uuid: dbInst.uuid,
      name: dbInst.name,
      scopeUuid: dbInst.scope_uuid,
      permissions: dbInst.permissions,
      scope: dbInst.scope,
      children: dbInst.children,
      parents: dbInst.parents,
    });
    return res as T;
  }

  protected async _clientToDb(clientObj: T, db: typeof FeatureTable): Promise<DbT> {
    const obj = clientObj.uuid
      ? (await db.findOrBuild({ where: { uuid: clientObj.uuid.toString() } }))[0]
      : new db();
    obj.uuid = clientObj.uuid?.toString();
    obj.name = clientObj.name;
    obj.scope_uuid = clientObj.scopeUuid;
    obj.permissions = clientObj.permissions;
    obj.scope = clientObj.scope;
    obj.children = clientObj.children;
    obj.parents = clientObj.parents;
    return obj as DbT;
  }
}