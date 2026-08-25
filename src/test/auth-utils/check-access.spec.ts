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

describe('Auth Utils - checkAccess', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  const reqUser = { uuid: 'user-uuid', username: 'admin', email: 'user@example.com', first_name: '', last_name: '', provider: 'github' };
  const featureCode = 'someFeature';
  const elementUuid = 'someElementUuid';
  const userInstance = { uuid: 'userUuid', email: reqUser.email } as DbUser;
  const featureInstance = { uuid: 'featureUuid', scope_uuid: 'scopeUuid' } as DbFeature;
  const groupMemberships = [{ group_uuid: 'groupUuid' }] as DbUserGroupMember[];
  const scopeInstance = { code: 'scopeCode' } as DbScope;
  const userGroups = [{ uuid: 'groupUuid', scope_element_uuid: elementUuid }] as DbUserGroup[];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should deny access if user does not exist', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(null);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if feature does not exist', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(null);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if user has no group memberships', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([]);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if scope does not exist', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(null);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if direct permission is deny', async () => {
    const directPermissions = [{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[];

    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny access if no direct permission and no parent permission on the element', async () => {
    const directPermissions = [{ is_deny: true, scope_element_uuid: 'differentElementUuid' }] as DbPermission[];

    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves(null);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should grant access if direct permission is granted and no ancestor deny', async () => {
    const directPermissions = [{ is_deny: false, scope_element_uuid: elementUuid }] as DbPermission[];

    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves(null);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('grant');
  });

  it('should deny access if parent permission is deny', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves([]);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves('deny');

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should grant access if no direct permission but parent permission is grant', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves([]);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves('grant');

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('grant');
  });

  it('should deny access if no direct permissions and parent permission is null', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves([]);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves(null);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should deny if userGroups do not match hierarchyUUIDs', async () => {
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves(['elementUuid', 'hierarchy-uuid-1']);

    const directPermissions = [{ is_deny: false, scope_element_uuid: 'elementUuid' }] as DbPermission[];

    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should grant if direct permission on one of the element match hierarchyUUIDs and no ancestor deny', async () => {
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([elementUuid, 'hierarchy-uuid-1']);

    const directPermissions = [{ is_deny: false, scope_element_uuid: 'hierarchy-uuid-1' }] as DbPermission[];

    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves(null);

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('grant');
  });

  it('should deny access if has a direct deny permission on hierarchy uuid', async () => {
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([elementUuid, 'hierarchy-uuid-1', 'hierarchy-uuid-2']);

    const directPermissions = [
      { is_deny: false, scope_element_uuid: elementUuid },
      { is_deny: true, scope_element_uuid: 'hierarchy-uuid-2' },
    ] as DbPermission[];

    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves('deny');

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('deny');
  });

  it('should grant access if user has no explicit allow permission and ancestor allow on hierarchy uuid', async () => {
    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([elementUuid, 'hierarchy-uuid-1']);

    const directPermissions = [{ is_deny: false, scope_element_uuid: 'elementUuid' }] as DbPermission[];

    sandbox.stub(DbUser, 'findOne').resolves(userInstance);
    sandbox.stub(DbFeature, 'findOne').resolves(featureInstance);
    sandbox.stub(DbUserGroupMember, 'findAll').resolves(groupMemberships);
    sandbox.stub(DbScope, 'findOne').resolves(scopeInstance);
    sandbox.stub(DbPermission, 'findAll').resolves(directPermissions);
    sandbox.stub(DbUserGroup, 'findAll').resolves(userGroups);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves('grant');

    const result = await ctx.authUtils.checkAccess(reqUser, featureCode, elementUuid);
    expect(result).to.equal('grant');
  });
});
