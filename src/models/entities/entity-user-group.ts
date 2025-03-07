import { EntityRequest } from "@all41-dev/server";
import { DestroyOptions, FindOptions, WhereAttributeHash } from "sequelize";
import { UserGroupTable } from "../../db/user-group-table";
import { UserGroup } from "../../models/user-group";

export class EntityUserGroup<DbT extends UserGroupTable, T extends UserGroup> extends EntityRequest<DbT, T> {
  public constructor(db?: new () => DbT) {
    super(db || UserGroupTable as any, UserGroup as any);
  }

  public setFilter(criteria: WhereAttributeHash): void {
    this._findOptions.where = criteria;
  }

  public async getById(pk: string): Promise<T> {
    return this.dbFindByPk(pk).then((res) => {
      if (res) {
        return this.dbToClient(res);
      }
      throw new Error("UserGroup not found");
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
    return this._clientToDb(clientObj, UserGroupTable);
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
    return UserGroupTable.findAll(options) as Promise<DbT[]>;
  }

  protected async dbFindByPk(pk: string): Promise<DbT | null> {
    return UserGroupTable.findByPk(pk) as Promise<DbT | null>;
  }

  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return Promise.resolve(UserGroupTable.destroy(options));
  }

  protected async _dbToClient(dbInst: DbT): Promise<T> {
    if (!dbInst.uuid) throw new Error("uuid is mandatory when retrieving from db");
    const res = Object.assign(new UserGroup({}), {
      uuid: dbInst.uuid,
      name: dbInst.name,
      scopeUuid: dbInst.scope_uuid,
      scopeElementUuid: dbInst.scope_element_uuid,
      permissions: dbInst.permissions,
      users: dbInst.users,
    });
    return res as T;
  }

  protected async _clientToDb(clientObj: T, db: typeof UserGroupTable): Promise<DbT> {
    const obj = clientObj.uuid
      ? (await db.findOrBuild({ where: { uuid: clientObj.uuid.toString() } }))[0]
      : new db();
    obj.uuid = clientObj.uuid?.toString();
    obj.name = clientObj.name;
    obj.scope_uuid = clientObj.scopeUuid;
    obj.scope_element_uuid = clientObj.scopeElementUuid;
    obj.permissions = clientObj.permissions;
    obj.users = clientObj.users;
    return obj as DbT;
  }
}