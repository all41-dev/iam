import { AuthUserTable } from "../db/auth-user-table";
import { UserGroupMemberTable } from "../db/user-group-member-table";
import { PermissionTable } from "../db/permission-table";
import { FeatureTable } from "../db/feature-table";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureCompositionTable } from "../db/feature-composition-table";
import { IUtilsOptions } from "../interfaces";
import { ScopeTable } from "../db/scope-table";
import { FeatureManager } from "./feature-manager";

interface PermissionContext { uuid: string; scope: string; status: string; type: "direct" | "ancestor" }

export class AuthUtils {

  private static instance: AuthUtils | undefined;
  private utilsOptions: IUtilsOptions;
  private featureManager: FeatureManager;

  private constructor(options?: IUtilsOptions) {
    this.utilsOptions = options ?? {};
    this.featureManager = FeatureManager.getInstance();
  }

  public get options() {
    return this.utilsOptions;
  }

  public static getInstance(options?: IUtilsOptions) {
    if (!AuthUtils.instance) {
      AuthUtils.instance = new AuthUtils(options);
    }
    return AuthUtils.instance;
  }

  public static resetInstance(options?: IUtilsOptions) {
    AuthUtils.instance = new AuthUtils(options);
  }

  async checkUser(profile: any, provider: string): Promise<{ user: any; error?: string }> {
    const email = profile.emails[0].value;
    const displayName = profile.displayName;
    const firstName = profile.name?.givenName || displayName.split(' ')[0];
    let lastName = profile.name?.familyName || displayName.split(' ')[1];
    if (!lastName) lastName = '';

    return await AuthUserTable.findOne({ where: { email } }).then(async (user) => {
      if (!user) {
        await AuthUserTable.create({
          email,
          username: displayName,
          first_name: firstName,
          last_name: lastName,
          provider,
        });
        return { user: false, error: 'denied' };
      } else if (provider !== user.provider) {
        return { user: false, error: 'provider' };
      } else {
        const permissions = (await this.checkEffectivePermissions(user.uuid));
        if (Object.keys(permissions).length === 0) {
          return { user: false, error: 'permission' };
        }
        return {
          user: {
            ...user.dataValues,
            permissions,
          },
        };
      }
    });
  }

  public async checkAncestorEffectivePermissions(
    featureUuid: string,
    groupUUIDs: string[],
    visited: Set<string> = new Set()
  ): Promise<{ inherited: boolean; permissions: { scope_element_uuid: string, scope_uuid: string, is_deny: boolean }[] }> {
    if (visited.has(featureUuid)) return { inherited: false, permissions: [] };

    visited.add(featureUuid);

    const compositions = await FeatureCompositionTable.findAll({
      where: { child_uuid: featureUuid },
    });

    if (compositions.length === 0) return { inherited: false, permissions: [] };

    const aggregatedPermissions: { scope_element_uuid: string; scope_uuid: string; is_deny: boolean; from_parent: boolean }[] = [];

    for (const composition of compositions) {
      const parentUuid = composition.parent_uuid;

      const currentPermissions = await PermissionTable.findAll({
        where: {
          feature_uuid: parentUuid,
          group_uuid: groupUUIDs,
        },
      });

      const feature = await FeatureTable.findByPk(parentUuid);
      aggregatedPermissions.push(
        ...currentPermissions.map((permission) => ({
          scope_element_uuid: permission.scope_element_uuid,
          scope_uuid: feature ? feature.scope_uuid : "",
          is_deny: permission.is_deny,
          from_parent: true,
        }))
      );

      const ancestorPermissions = await this.checkAncestorEffectivePermissions(
        parentUuid,
        groupUUIDs,
        visited
      );

      if (ancestorPermissions.inherited) {
        aggregatedPermissions.push(
          ...ancestorPermissions.permissions.map((perm) => ({
            ...perm,
            from_parent: true,
          }))
        );
      }
    }

    const currentFeaturePermissions = await PermissionTable.findAll({
      where: {
        feature_uuid: featureUuid,
        group_uuid: groupUUIDs,
      },
    });

    const feature = await FeatureTable.findByPk(featureUuid);
    aggregatedPermissions.push(
      ...currentFeaturePermissions.map((permission) => ({
        scope_element_uuid: permission.scope_element_uuid,
        scope_uuid: feature ? feature.scope_uuid : "",
        is_deny: permission.is_deny,
        from_parent: false,
      }))
    );

    const filteredPermissions = Object.values(
      aggregatedPermissions.reduce<Record<string, { scope_element_uuid: string; scope_uuid: string; is_deny: boolean }>>(
        (acc, permission) => {
          const key = `${permission.scope_element_uuid}:${permission.scope_uuid}`;
          if (!acc[key] || (permission.is_deny && permission.from_parent)) {
            acc[key] = {
              scope_element_uuid: permission.scope_element_uuid,
              scope_uuid: permission.scope_uuid,
              is_deny: permission.is_deny,
            };
          }
          return acc;
        },
        {}
      )
    );

    return {
      inherited: filteredPermissions.length > 0,
      permissions: filteredPermissions,
    };
  }

  public async checkEffectivePermissions(
    auth_user_uuid?: string,
    group_uuid?: string
  ): Promise<{ [uuid: string]: { right: string; context: PermissionContext[] } }> {
    let groupUUIDs = [];
    if (!group_uuid) {
      const user = await AuthUserTable.findByPk(auth_user_uuid);
      if (!user) return {};

      const groupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid } });
      if (groupMemberships.length) return {};
      groupUUIDs = groupMemberships.map((membership) => membership.dataValues.group_uuid);
    } else if (!auth_user_uuid) {
      groupUUIDs = [group_uuid];
      const group = await UserGroupTable.findByPk(group_uuid);
      if (!group) return {};
    } else {
      return {};
    }

    const permissionsMap: { [uuid: string]: { right: string; context: PermissionContext[] } } = {};
    const scopeUUIDs = await this.featureManager.getGroupsScopeList(groupUUIDs);
    const features = await FeatureTable.findAll({ where: { scope_uuid: scopeUUIDs } });

    for (const feature of features) {
      const featureUuid = feature.uuid;
      const featureCode = feature.code;

      const directPermissions = await PermissionTable.findAll({
        where: {
          feature_uuid: featureUuid,
          group_uuid: groupUUIDs,
        },
      });

      const contextSet = new Set<string>();
      const context: PermissionContext[] = [];

      for (const permission of directPermissions) {
        const scopeFeature = await ScopeTable.findByPk(feature.scope_uuid)
        const permissionStatus = permission.is_deny ? "denied" : "granted";
        const contextKey = `${permission.scope_element_uuid}-${permissionStatus}`;

        if (!contextSet.has(contextKey)) {
          contextSet.add(contextKey);
          context.push({ uuid: permission.scope_element_uuid, scope: scopeFeature ? scopeFeature.name : "", status: permissionStatus, type: "direct" });
        }

        permissionsMap[featureCode] = {
          right: permission.is_deny ? "directDeny" : "directGrant",
          context: context,
        };
      }

      const ancestorPermissions = await this.checkAncestorEffectivePermissions(featureUuid, groupUUIDs);

      const denyExists = ancestorPermissions.permissions.some((p) => p.is_deny);
      const grantExists = ancestorPermissions.permissions.some((p) => !p.is_deny)

      const ancestorContextSet = new Set();
      const ancestorContext: PermissionContext[] = [];

      for (const permission of ancestorPermissions.permissions) {
        const permissionStatus = permission.is_deny ? "denied" : "granted";
        const contextKey = `${permission.scope_element_uuid}-${permissionStatus}`;
        const scopeFeature = await ScopeTable.findByPk(permission.scope_uuid)

        if (!ancestorContextSet.has(contextKey)) {
          ancestorContextSet.add(contextKey);
          ancestorContext.push({ uuid: permission.scope_element_uuid, scope: scopeFeature ? scopeFeature.name : "", status: permissionStatus, type: "ancestor" });
        }
      }

      if (permissionsMap[featureCode]) {
        let newRight = permissionsMap[featureCode].right;

        const directDenyMatch = directPermissions.some((direct) => {
          return (
            direct.is_deny &&
            ancestorPermissions.permissions.some(
              (ancestor) =>
                !ancestor.is_deny &&
                ancestor.scope_element_uuid === direct.scope_element_uuid
            )
          );
        });
        if (directDenyMatch) {
          newRight = "directDeny";
        } else if (denyExists && newRight === "directGrant") {
          newRight = "partialDeny";
        } else if (grantExists && newRight === "directDeny") {
          newRight = "partialDeny";
        }
        permissionsMap[featureCode].right = newRight;
        permissionsMap[featureCode].context.push(...ancestorContext);
      } else {
        const initialRight = denyExists
          ? grantExists
            ? "partialDeny"
            : "ancestorDeny"
          : grantExists
            ? "ancestorGrant"
            : "noRight";

        permissionsMap[featureCode] = {
          right: initialRight,
          context: ancestorContext,
        };
      }
    }

    return permissionsMap;
  }

  async checkAccess(userEmail: string, featureCode: string, elementUuid: string): Promise<"grant" | "deny"> {
    const user = await AuthUserTable.findOne({ where: { email: userEmail } })
    if (!user) return "deny";

    const feature = await FeatureTable.findOne({ where: { code: featureCode } });
    if (!feature) return "deny";

    const userGroupMemberships = await UserGroupMemberTable.findAll({ where: { auth_user_uuid: user.uuid } });
    if (!userGroupMemberships.length) return "deny";

    const groupUUIDs = userGroupMemberships.map((group) => group.group_uuid);

    const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
    if (!scope) return "deny";

    const directPermissions = await PermissionTable.findAll({
      where: {
        feature_uuid: feature.uuid,
        group_uuid: groupUUIDs,
      },
    });

    const scopeHierarchy = this.utilsOptions.scopeHierarchy ? await this.utilsOptions.scopeHierarchy(elementUuid, scope.code) : {};
    const hierarchyUUIDs = Object.values(scopeHierarchy);

    for (const permission of directPermissions) {
      if (permission.is_deny) {
        if (!permission.scope_element_uuid || permission.scope_element_uuid === elementUuid || hierarchyUUIDs.includes(permission.scope_element_uuid)) {
          return "deny";
        }
      }
    }

    const noElementPermission = !(directPermissions.some(permission =>
      !permission.scope_element_uuid ||
      permission.scope_element_uuid === elementUuid ||
      hierarchyUUIDs.includes(permission.scope_element_uuid)));

    const userGroups = await UserGroupTable.findAll({
      where: {
        uuid: groupUUIDs,
      },
    });

    if (!userGroups.some(group => hierarchyUUIDs.includes(group.scope_element_uuid)) && this.utilsOptions.scopeHierarchy) {
      return "deny";
    }


    const parentPermission = await this.checkParentFeaturePermissions(feature.uuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    if (parentPermission === "deny") return "deny";
    if (parentPermission === "grant") return "grant";
    if (parentPermission === null) {
      if (directPermissions.length === 0 || noElementPermission) return "deny";
    }

    return "grant";
  }

  async checkParentFeaturePermissions(featureUuid: string, groupUUIDs: string[], elementUuid: string, hierarchyUUIDs: string[], visited: Set<string> = new Set()): Promise<"grant" | "deny" | null> {
    if (visited.has(featureUuid)) return null;
    visited.add(featureUuid);

    const compositions = await FeatureCompositionTable.findAll({ where: { child_uuid: featureUuid } });
    let foundGrant = false;

    for (const composition of compositions) {
      const parentUuid = composition.parent_uuid;

      const parentPermissions = await PermissionTable.findAll({
        where: {
          feature_uuid: parentUuid,
          group_uuid: groupUUIDs,
        },
      });

      const feature = await FeatureTable.findOne({ where: { uuid: featureUuid } });
      if (!feature) return null;

      const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
      if (!scope) return null;

      for (const permission of parentPermissions) {
        if (!permission.scope_element_uuid || permission.scope_element_uuid === elementUuid || hierarchyUUIDs.includes(permission.scope_element_uuid)) {
          if (permission.is_deny) {
            return "deny";
          }
          foundGrant = true;
        }
      }

      const ancestorPermission = await this.checkParentFeaturePermissions(parentUuid, groupUUIDs, elementUuid, hierarchyUUIDs, visited);
      if (ancestorPermission === "deny") return "deny";
      if (ancestorPermission === "grant") foundGrant = true;
    }

    return foundGrant ? "grant" : null;
  }

  async verifyGroupCollision(groupUUIDs: string[]): Promise<{ conflictType: string; permissions: any[] }[]> {
    const conflicts: { conflictType: string; permissions: any[] }[] = [];

    const groups = await UserGroupTable.findAll({ where: { uuid: groupUUIDs } });
    const permissions = await PermissionTable.findAll({ where: { group_uuid: groupUUIDs } });

    for (const permission of permissions) {
      const feature = await FeatureTable.findOne({ where: { uuid: permission.feature_uuid } });
      if (!feature) continue;

      const scope = await ScopeTable.findOne({ where: { uuid: feature.scope_uuid } });
      if (!scope) throw new Error("No scope found");

      const scopeHierarchy = this.utilsOptions.scopeHierarchy
        ? await this.utilsOptions.scopeHierarchy(permission.scope_element_uuid, scope.code)
        : {};
      const hierarchyUUIDs = Object.values(scopeHierarchy);

      if (!permission.is_deny) {
        const ancestorResult = await this.checkParentFeaturePermissions(
          permission.feature_uuid,
          groupUUIDs,
          permission.scope_element_uuid,
          hierarchyUUIDs
        );

        if (ancestorResult === "deny") {
          conflicts.push({
            conflictType: "grant_overridden_by_deny",
            permissions: [permission],
          });
        }
      }
    }
    return conflicts;
  }

  public async buildScopeElementHierarchy(scopeUuid?: string, elementUuid?: string): Promise<any> {
    if (this.options.scopeElementHierarchy) {
      if (!scopeUuid) return this.options.scopeElementHierarchy()
      const code = await ScopeTable.findByPk(scopeUuid).then((scope) => scope?.code)
      if (!code) return;
      return this.options.scopeElementHierarchy(code, elementUuid);
    }
  }
}