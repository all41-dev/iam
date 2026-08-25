import { expect } from 'chai';
import sinon from 'sinon';
import { DbUser } from '../../db/db-user';
import { DbFeature } from '../../db/db-feature';
import { DbUserGroupMember } from '../../db/db-user-group-member';
import { DbPermission } from '../../db/db-permission';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - getSpecificElementDeny', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  const reqUser = { uuid: 'user-uuid', username: 'admin', email: 'test@example.com', first_name: '', last_name: '', provider: 'github' };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return an empty array if the user is not found', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves(null);
    const result = await ctx.authUtils.getSpecificElementDeny(reqUser, 'featureCode');
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if the user has no group memberships', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' } })
      .resolves([] as DbUserGroupMember[]);
    const result = await ctx.authUtils.getSpecificElementDeny(reqUser, 'featureCode');
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if the feature is not found', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' } })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findOne')
      .withArgs({ where: { code: 'featureCode' } })
      .resolves(null);

    const result = await ctx.authUtils.getSpecificElementDeny(reqUser, 'featureCode');
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if there are no deny permissions', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' } })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findOne')
      .withArgs({ where: { code: 'featureCode' } })
      .resolves({ uuid: 'feature1' } as DbFeature);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'], is_deny: true } })
      .resolves([]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [],
    });

    const result = await ctx.authUtils.getSpecificElementDeny(reqUser, 'featureCode');
    expect(result).to.deep.equal([]);
  });

  it('should return scope element UUIDs for valid deny permissions', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' } })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findOne')
      .withArgs({ where: { code: 'featureCode' } })
      .resolves({ uuid: 'feature1' } as DbFeature);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'], is_deny: true } })
      .resolves([{ feature_uuid: 'feature1', scope_element_uuid: 'scopeElement1' }] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [{ scope_element_uuid: 'scopeElement2', scope_uuid: 'scope1', feature_code: 'featureCode', is_deny: true }],
    });

    const result = await ctx.authUtils.getSpecificElementDeny(reqUser, 'featureCode');
    expect(result).to.deep.equal(['scopeElement1', 'scopeElement2']);
  });

  it('should return empty array if nothing valid is found', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'test@example.com' } })
      .resolves({ uuid: 'user1' } as DbUser);
    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user1' } })
      .resolves([{ group_uuid: 'group1' }] as DbUserGroupMember[]);
    sandbox
      .stub(DbFeature, 'findOne')
      .withArgs({ where: { code: 'featureCode' } })
      .resolves({ uuid: 'feature1' } as DbFeature);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'], is_deny: true } })
      .resolves([{ feature_uuid: 'feature2', scope_element_uuid: 'scopeElement1' }] as DbPermission[]);
    sandbox.stub(ctx.authUtils, 'checkAncestorEffectivePermissions').resolves({
      inherited: true,
      permissions: [],
    });
    const result = await ctx.authUtils.getSpecificElementDeny(reqUser, 'featureCode');
    expect(result).to.deep.equal([]);
  });
});
