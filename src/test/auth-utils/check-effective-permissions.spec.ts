import { expect } from 'chai';
import sinon from 'sinon';
import { DbUser } from '../../db/db-user';
import { DbFeature } from '../../db/db-feature';
import { DbUserGroupMember } from '../../db/db-user-group-member';
import { DbScope } from '../../db/db-scope';
import { DbPermission } from '../../db/db-permission';
import { DbUserGroup } from '../../db/db-user-group';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - checkEffectivePermissions', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return an empty object if the user does not exist', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves(null);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid');
    expect(result).to.deep.equal({});
  });

  it('should return an empty object if the user does not belong to any group', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as DbUser);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([]);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid');
    expect(result).to.deep.equal({});
  });

  it('should return an empty object if the group does not exist', async () => {
    sandbox.stub(DbUserGroup, 'findByPk').resolves(null);

    const result = await ctx.authUtils.checkEffectivePermissions('', 'groupUuid');
    expect(result).to.deep.equal({});
  });

  it('should return an empty object if both user and group are provided', async () => {
    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', 'groupUuid');
    expect(result).to.deep.equal({});
  });

  it('should return permissions for a user with granted permissions', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as DbUser);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid', user_uuid: 'userUuid' }] as DbUserGroupMember[]);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ scope_element_uuid: 'elementUuid', is_deny: false }] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
    sandbox.stub(DbScope, 'findByPk').resolves({ name: 'scopeName' } as DbScope);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'grant',
        context: [{ uuid: 'elementUuid', scope: 'scopeName', status: 'granted', type: 'direct' }],
      },
    });
  });

  it('should return permissions for a group with granted permissions', async () => {
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ scope_element_uuid: 'elementUuid', is_deny: false }] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
    sandbox.stub(DbScope, 'findByPk').resolves({ name: 'scopeName' } as DbScope);

    const result = await ctx.authUtils.checkEffectivePermissions('', 'groupUuid');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'grant',
        context: [{ uuid: 'elementUuid', scope: 'scopeName', status: 'granted', type: 'direct' }],
      },
    });
  });

  it('should return permissions for a group with granted permissions without scopeName if Scope not found', async () => {
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ scope_element_uuid: 'elementUuid', is_deny: false }] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
    sandbox.stub(DbScope, 'findByPk').resolves(null);

    const result = await ctx.authUtils.checkEffectivePermissions('', 'groupUuid');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'grant',
        context: [{ uuid: 'elementUuid', scope: '', status: 'granted', type: 'direct' }],
      },
    });
  });

  it('should return permissions for a user in a group with granted permissions', async () => {
    const userGroupMembership = { group_uuid: 'groupUuid' };
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([userGroupMembership] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ scope_element_uuid: 'elementUuid', is_deny: false }] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
    sandbox.stub(DbScope, 'findByPk').resolves({ name: 'scopeName' } as DbScope);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'grant',
        context: [{ uuid: 'elementUuid', scope: 'scopeName', status: 'granted', type: 'direct' }],
      },
    });
  });

  it('should return permissions for a user in a group with granted permissions in ancestor', async () => {
    const userGroupMembership = { group_uuid: 'groupUuid' };
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([userGroupMembership] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([]);
    sandbox
      .stub(ctx.authUtils, 'checkAncestorEffectivePermissions')
      .resolves({ inherited: true, permissions: [{ scope_element_uuid: 'elementUuid', is_deny: false, feature_code: 'featureCode1', scope_uuid: 'scopeUuid' }] });
    sandbox.stub(DbScope, 'findByPk').resolves({ name: 'scopeName' } as DbScope);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'grant',
        context: [{ feature_code: 'featureCode1', uuid: 'elementUuid', scope: 'scopeName', status: 'granted', type: 'ancestor' }],
      },
    });
  });

  it('should return permissions for a user in a group with denied permissions in ancestor', async () => {
    const userGroupMembership = { group_uuid: 'groupUuid' };
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([userGroupMembership] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([]);
    sandbox
      .stub(ctx.authUtils, 'checkAncestorEffectivePermissions')
      .resolves({ inherited: true, permissions: [{ scope_element_uuid: 'elementUuid', is_deny: true, feature_code: 'featureCode1', scope_uuid: 'scopeUuid' }] });
    sandbox.stub(DbScope, 'findByPk').resolves({ name: 'scopeName' } as DbScope);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'deny',
        context: [{ feature_code: 'featureCode1', uuid: 'elementUuid', scope: 'scopeName', status: 'denied', type: 'ancestor' }],
      },
    });
  });

  it('should return permissions with deny status when direct deny is present', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as DbUser);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid' }] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ scope_element_uuid: 'elementUuid', is_deny: true }] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
    sandbox.stub(DbScope, 'findByPk').resolves({ name: 'scopeName' } as DbScope);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'deny',
        context: [{ uuid: 'elementUuid', scope: 'scopeName', status: 'denied', type: 'direct' }],
      },
    });
  });

  it('should handle both granted and denied ancestor permissions', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as DbUser);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid' }] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [
        { scope_element_uuid: 'elementUuid', is_deny: true, feature_code: 'featureCode1', scope_uuid: 'scopeUuid' },
        { scope_element_uuid: 'elementUuid', is_deny: false, feature_code: 'featureCode2', scope_uuid: 'scopeUuid' },
      ],
    });

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scopeUuid')
      .resolves({ uuid: 'scopeUuid', name: 'scopeName', code: 'scopeCode' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid', 'scopeCode').resolves(['elementUuid']);

    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'deny',
        context: [
          { feature_code: 'featureCode1', uuid: 'elementUuid', scope: 'scopeName', status: 'denied', type: 'ancestor' },
          { feature_code: 'featureCode2', uuid: 'elementUuid', scope: 'scopeName', status: 'granted', type: 'ancestor' },
        ],
      },
    });
  });

  it('should handle deny ancestor where both grant and deny are present on the same element', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid' }] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ scope_element_uuid: 'elementUuid', is_deny: false }] as DbPermission[]);
    sandbox
      .stub(ctx.authUtils, 'checkAncestorEffectivePermissions')
      .resolves({ inherited: true, permissions: [{ scope_element_uuid: 'elementUuid', is_deny: true, feature_code: 'featureCode1', scope_uuid: 'scopeUuid' }] });
    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scopeUuid')
      .resolves({ uuid: 'scopeUuid', name: 'scopeName', code: 'scopeCode' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid', 'scopeCode').resolves(['elementUuid']);
    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'rightConflict',
        context: [
          { uuid: 'elementUuid', scope: 'scopeName', status: 'granted', type: 'direct' },
          { feature_code: 'featureCode1', uuid: 'elementUuid', scope: 'scopeName', status: 'denied', type: 'ancestor' },
        ],
      },
    });
  });

  it('should handle deny ancestor where both grant and deny are present on the same element', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid' }] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([
      { scope_element_uuid: 'elementUuid', is_deny: false },
      { scope_element_uuid: 'elementUuid', is_deny: true },
    ] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scopeUuid')
      .resolves({ uuid: 'scopeUuid', name: 'scopeName', code: 'scopeCode' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid', 'scopeCode').resolves(['elementUuid']);
    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'rightConflict',
        context: [
          { uuid: 'elementUuid', scope: 'scopeName', status: 'granted', type: 'direct' },
          { uuid: 'elementUuid', scope: 'scopeName', status: 'denied', type: 'direct' },
        ],
      },
    });
  });

  it('should handle partialDeny where both grant and deny on element of the same hierarchy', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid' }] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ scope_element_uuid: 'elementUuid', is_deny: true }] as DbPermission[]);
    sandbox
      .stub(ctx.authUtils, 'checkAncestorEffectivePermissions')
      .resolves({ inherited: true, permissions: [{ scope_element_uuid: 'ancestorElementUuid', is_deny: false, feature_code: 'featureCode1', scope_uuid: 'scopeAncestorUuid' }] });
    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scopeUuid')
      .resolves({ uuid: 'scopeUuid', name: 'scopeName', code: 'scopeCode' } as DbScope)
      .withArgs('scopeAncestorUuid')
      .resolves(null);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid', 'scopeCode').resolves(['ancestorElementUuid', 'elementUuid']);
    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'partialDeny',
        context: [
          { uuid: 'elementUuid', scope: 'scopeName', status: 'denied', type: 'direct' },
          { feature_code: 'featureCode1', uuid: 'ancestorElementUuid', scope: '', status: 'granted', type: 'ancestor' },
        ],
      },
    });
  });

  it('should handle partialGrant ancestor where both grant and deny are present on the different element', async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid' }] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [
        { scope_element_uuid: 'ancestorElementUuid1', is_deny: false, feature_code: 'featureCode1', scope_uuid: 'scopeAncestorUuid' },
        { scope_element_uuid: 'ancestorElementUuid2', is_deny: true, feature_code: 'featureCode1', scope_uuid: 'scopeAncestorUuid' },
      ],
    });
    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scopeAncestorUuid')
      .resolves({ uuid: 'scopeUuid', name: 'scopeName', code: 'scopeCode' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid', 'scopeCode').resolves(['ancestorElementUuid2', 'ancestorElementUuid1', 'elementUuid']);
    const result = await ctx.authUtils.checkEffectivePermissions('userUuid', '');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'partialGrant',
        context: [
          { feature_code: 'featureCode1', uuid: 'ancestorElementUuid1', scope: 'scopeName', status: 'granted', type: 'ancestor' },
          { feature_code: 'featureCode1', uuid: 'ancestorElementUuid2', scope: 'scopeName', status: 'denied', type: 'ancestor' },
        ],
      },
    });
  });

  it("should return 'noRight' when no permissions exist and no ancestor conflicts are present", async () => {
    sandbox.stub(DbUser, 'findByPk').resolves({ uuid: 'userUuid' } as any);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'groupUuid' }] as DbUserGroupMember[]);
    sandbox.stub(DbUserGroup, 'findByPk').resolves({ uuid: 'groupUuid' } as DbUserGroup);
    sandbox.stub(ctx.featureUtils, 'getGroupsScopeList').resolves(['scopeUuid']);
    sandbox.stub(DbFeature, 'findAll').resolves([{ uuid: 'featureUuid', code: 'featureCode', scope_uuid: 'scopeUuid' }] as DbFeature[]);
    sandbox.stub(DbPermission, 'findAll').resolves([] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: true, permissions: [] });
    sandbox.stub(DbScope, 'findByPk').resolves({ name: 'scopeName' } as DbScope);

    const result = await ctx.authUtils.checkEffectivePermissions('', 'groupUuid');
    expect(result).to.deep.equal({
      featureCode: {
        right: 'noRight',
        context: [],
      },
    });
  });
});
