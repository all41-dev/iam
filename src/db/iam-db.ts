import { Db } from "@all41-dev/db-tools";
import { DbFeatureComposition } from "./db-feature-composition";
import { DbFeature } from "./db-feature";
import { DbPermission } from "./db-permission";
import { DbScope } from "./db-scope";
import { DbUserGroupMember } from "./db-user-group-member";
import { DbUserGroup } from "./db-user-group";
import { DbUser } from "./db-user";
import { DbRefreshToken } from "./db-refresh-token";

export class IamDb extends Db<IamDb> {
  public async init(): Promise<void> {
    await this._init();
    IamDb.inst = this;
    this.sequelize.addModels([
      DbFeatureComposition,
      DbFeature,
      DbPermission,
      DbScope,
      DbUserGroupMember,
      DbUserGroup,
      DbUser,
      DbRefreshToken
    ]);
  }
}