import { EntityRequest } from "@all41-dev/server";
import { DestroyOptions, FindOptions, WhereAttributeHash } from "sequelize";
import { PermissionTable } from "../../db/permission-table";
import { Permission } from "../../models/permission";

export class EntityPermission<DbT extends PermissionTable, T extends Permission> extends EntityRequest<DbT, T> {
  public constructor(db?: new () => DbT) {
    super(db || PermissionTable as any, Permission as any);
  }

  public setFilter(criteria: WhereAttributeHash): void {
    this._findOptions.where = criteria;
  }

  public async getById(pk: string): Promise<T> {
    return this.dbFindByPk(pk).then((res) => {
      if (res) {
        return this.dbToClient(res);
      }
      throw new Error("Permission not found");
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
    return this._clientToDb(clientObj, PermissionTable);
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
    return PermissionTable.findAll(options) as Promise<DbT[]>;
  }

  protected async dbFindByPk(pk: string): Promise<DbT | null> {
    return PermissionTable.findByPk(pk) as Promise<DbT | null>;
  }

  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return Promise.resolve(PermissionTable.destroy(options));
  }

  protected async _dbToClient(dbInst: DbT): Promise<T> {
    if (!dbInst.uuid) throw new Error("uuid is mandatory when retrieving from db");
    const res = Object.assign(new Permission({}), {
      uuid: dbInst.uuid,
      isDeny: dbInst.is_deny,
      featureScopeUuid: dbInst.feature_scope_uuid,
      groupUuid: dbInst.group_uuid,
      featureUuid: dbInst.feature_uuid,
      group: dbInst.group,
      feature: dbInst.feature,
    });
    return res as T;
  }

  protected async _clientToDb(clientObj: T, db: typeof PermissionTable): Promise<DbT> {
    const obj = clientObj.uuid
      ? (await db.findOrBuild({ where: { uuid: clientObj.uuid.toString() } }))[0]
      : new db();
    obj.uuid = clientObj.uuid?.toString();
    obj.is_deny = clientObj.isDeny;
    obj.feature_scope_uuid = clientObj.featureScopeUuid;
    obj.group_uuid = clientObj.groupUuid;
    obj.feature_uuid = clientObj.featureUuid;
    return obj as DbT;
  }
}