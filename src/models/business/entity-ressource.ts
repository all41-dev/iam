import { Ressource } from "@all41-dev/iam.model";
import { EntityRequest } from "@all41-dev/server";
import { FindOptions, DestroyOptions, Op } from "sequelize";
import { DbRessource } from "../db/db-ressource";

export class EntityRessource extends EntityRequest<DbRessource, Ressource> {
  public constructor() {
    super(DbRessource);
  }
  async dbToClient(dbObj: DbRessource): Promise<Ressource> {
    const res = new Ressource({
      name: dbObj.name,
      uuid: dbObj.uuid,
      nodeName: dbObj.path.substr(dbObj.path.lastIndexOf('/') + 1),
      parentPath: dbObj.path.substr(0, dbObj.path.lastIndexOf('/')),
      parentUuid: dbObj.parentUuid,
    });
    return res;
  }
  async clientToDb(clientObj: Ressource): Promise<DbRessource> {
    if (!(clientObj instanceof Ressource)) clientObj = new Ressource(clientObj);
    
    const obj = clientObj.uuid ?
      (await DbRessource.findOrBuild({ where: { uuid: clientObj.uuid } }))[0] :
      new DbRessource();
    obj.uuid = clientObj.uuid;
    obj.name = clientObj.name;
    obj.path = clientObj.path;
    obj.parentUuid = clientObj.parentUuid;
    return obj;
  }
  setRessourceOnlyFilter(): void {
    this._findOptions.where = {
      path: {
        [Op.notLike]: '/root/users/%',
      }
    }
    this._findOptions.order = ['path'];
  }
  setFilter(opt: any): void {
    // nothing to do
    // throw new Error("Method not implemented.");
  }
  async preCreation(obj: Ressource): Promise<Ressource> {
    return obj;
  }
  async preUpdate(obj: Ressource): Promise<Ressource> {
    return obj;
  }
  async preDelete(id: string | number): Promise<number> {
    return 0;
  }
  async postCreation(obj: DbRessource): Promise<DbRessource> {
    return obj;
  }
  setIncludes(includePaths: string[]): void {
    return;
  }
  protected dbFindAll(options: FindOptions): Promise<DbRessource[]> {
    return DbRessource.findAll(options);
  }
  protected dbFindByPk(pk: string): Promise<DbRessource | null> {
    return DbRessource.findByPk(pk);
  }
  protected dbDestroy(options: DestroyOptions): Promise<number> {
    return DbRessource.destroy(options);
  }
}