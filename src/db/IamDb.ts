import { Db } from "@all41-dev/db-tools";
import { FeatureCompositionTable } from "./feature-composition-table";
import { FeatureTable } from "./feature-table";
import { PermissionTable } from "./permission-table";
import { ScopeTable } from "./scope-table";
import { UserGroupMemberTable } from "./user-group-member-table";
import { UserGroupTable } from "./user-group-table";
import { AuthUserTable } from "./auth-user-table";
import { RefreshTokenTable } from "./refresh-token-table";

export class IamDb extends Db<IamDb> {
  public async init() {
    await this._init();
    IamDb.inst = this;
    this.sequelize.addModels([
      FeatureCompositionTable,
      FeatureTable,
      PermissionTable,
      ScopeTable,
      UserGroupMemberTable,
      UserGroupTable,
      AuthUserTable,
      RefreshTokenTable
    ]);
  }
}