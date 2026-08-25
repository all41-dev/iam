import { expect } from 'chai';
import sinon from 'sinon';
import { DbUser } from '../../db/db-user';
import { DbFeature } from '../../db/db-feature';
import { DbUserGroupMember } from '../../db/db-user-group-member';
import { DbScope } from '../../db/db-scope';
import { DbPermission } from '../../db/db-permission';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - getPermissionsScopeElement', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return an empty array if user is not found', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(null);
    sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scopeUuid' } as DbScope);

    const result = await ctx.authUtils.getPermissionsScopeElement('user@example.com', 'scopeCode', 'elementUuid');
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if scope is not found', async () => {
    sandbox.stub(DbUser, 'findOne').resolves({ uuid: 'userUuid' } as DbUser);
    sandbox.stub(DbScope, 'findOne').resolves(null);

    const result = await ctx.authUtils.getPermissionsScopeElement('user@example.com', 'scopeCode', 'elementUuid');
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if the user has no group memberships', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1' } as DbScope);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([]);

    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if there are no deny permissions', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1' } as DbScope);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] }, raw: true })
      .resolves([]);

    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });

    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([]);

    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([]);
  });

  it('should return permissions for each feature found', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] }, raw: true })
      .resolves([{ feature_uuid: 'feature1', scope_element_uuid: 'scopeElement', is_deny: true }] as DbPermission[]);

    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });

    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([]);

    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([
      {
        featureCode: 'featureCode',
        scopeCode: 'scopeCode',
        permissions: [{ uuid: 'scopeElement', status: 'deny' }],
      },
    ]);
  });

  it('should handle inherited permissions of higher hierarchy correctly', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] }, raw: true })
      .resolves([]);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCodeAncestor' } as DbScope);

    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [
        { scope_uuid: 'scope2', scope_element_uuid: 'ancestor1', feature_code: 'featureCode', is_deny: true },
        { scope_uuid: 'scope2', scope_element_uuid: 'ancestor1', feature_code: 'featureCode', is_deny: false },
      ],
    });

    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub)
      .withArgs('ancestor1', 'scopeCodeAncestor')
      .resolves(['ancestor1'])
      .withArgs('scopeElement', 'scopeCode')
      .resolves(['ancestor1', 'scopeElement']);

    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([
      {
        featureCode: 'featureCode',
        scopeCode: 'scopeCode',
        permissions: [
          { uuid: 'scopeElement', status: 'deny' },
          { uuid: 'scopeElement', status: 'grant' },
        ],
      },
    ]);
  });

  it('should handle inherited permissions of lower hierarchy correctly', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] }, raw: true })
      .resolves([]);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCodeDescendant' } as DbScope);

    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [
        { scope_uuid: 'scope2', scope_element_uuid: 'descendant1', feature_code: 'featureCode', is_deny: true },
        { scope_uuid: 'scope2', scope_element_uuid: 'descendant1', feature_code: 'featureCode', is_deny: false },
      ],
    });

    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub)
      .withArgs('descendant1', 'scopeCodeDescendant')
      .resolves(['scopeElement', 'descendant1'])
      .withArgs('scopeElement', 'scopeCode')
      .resolves(['scopeElement']);

    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([
      {
        featureCode: 'featureCode',
        scopeCode: 'scopeCode',
        permissions: [
          { uuid: 'descendant1', status: 'deny' },
          { uuid: 'descendant1', status: 'grant' },
        ],
      },
    ]);
  });

  it('should skip permissions with non-existent features', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] }, raw: true })
      .resolves([{ feature_uuid: 'nonExistentFeature', scope_element_uuid: 'scopeElement', is_deny: false }] as DbPermission[]);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCodeDescendant' } as DbScope);

    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({ inherited: false, permissions: [] });
    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub)
      .withArgs('descendant1', 'scopeCodeDescendant')
      .resolves(['scopeElement', 'descendant1'])
      .withArgs('scopeElement', 'scopeCode')
      .resolves(['scopeElement']);
    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([]);
  });

  it('should process direct and inherited permissions and handle missing element scopes', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);

    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] }, raw: true })
      .resolves([{ feature_uuid: 'feature1', scope_element_uuid: 'scopeElement', is_deny: false }] as DbPermission[]);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCodeDescendant' } as DbScope)
      .withArgs('missingScope')
      .resolves(null);

    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [
        { scope_uuid: 'scope2', scope_element_uuid: 'descendant1', feature_code: 'featureCode', is_deny: true },
        { scope_uuid: 'missingScope', scope_element_uuid: 'missingElement', feature_code: 'featureCode', is_deny: false },
      ],
    });

    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub)
      .withArgs('descendant1', 'scopeCodeDescendant')
      .resolves(['scopeElement', 'descendant1'])
      .withArgs('scopeElement', 'scopeCode')
      .resolves(['scopeElement']);

    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([
      {
        featureCode: 'featureCode',
        scopeCode: 'scopeCode',
        permissions: [
          { uuid: 'scopeElement', status: 'grant' },
          { uuid: 'descendant1', status: 'deny' },
        ],
      },
    ]);
  });

  it('should handle inherited permissions of unknown hierarchy correctly', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { code: 'scopeCode' } })
      .resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' }, raw: true })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findAll')
      .withArgs({ where: { scope_uuid: ['scope1'] } })
      .resolves([{ uuid: 'feature1', code: 'featureCode' }] as DbFeature[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] }, raw: true })
      .resolves([]);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCodeUnknown' } as DbScope);

    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [{ scope_uuid: 'scope2', scope_element_uuid: 'unknown1', feature_code: 'featureCode', is_deny: true }],
    });

    sandbox.stub(ctx.featureUtils, 'getAllChildScopes').resolves([]);
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('unknown1', 'scopeCodeUnknown').resolves(['unknown1']).withArgs('scopeElement', 'scopeCode').resolves(['scopeElement']);

    const result = await ctx.authUtils.getPermissionsScopeElement('test@example.com', 'scopeCode', 'scopeElement');
    expect(result).to.deep.equal([]);
  });
});
