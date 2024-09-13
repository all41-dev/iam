import { Db } from "@all41-dev/db-tools";
import { FeatureComposition } from "./models/feature_composition";
import { Feature } from "./models/feature";
import { Permission } from "./models/permission";
import { Scope } from "./models/scope";
import { UserGroupMember } from "./models/user-group-member";
import { UserGroup } from "./models/user-group";
import { User } from "./models/user";

export class IamDb extends Db<IamDb> {
	public async init() {
		await this._init();
		IamDb.inst = this;
		this.sequelize.addModels([
			FeatureComposition,
			Feature,
			Permission,
			Scope,
			UserGroupMember,
			UserGroup,
			User,
		]);
	}
}