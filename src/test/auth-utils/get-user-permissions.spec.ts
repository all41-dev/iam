import { expect } from 'chai';
import sinon from 'sinon';
import { DbUser } from '../../db/db-user';
import { DbUserGroupMember } from '../../db/db-user-group-member';
import { DbPermission } from '../../db/db-permission';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - getUserPermissions', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should throw an error if neither userUuid nor userEmail is provided', async () => {
    try {
      await ctx.authUtils.getUserPermissions(undefined, undefined);
      throw new Error('Test failed: error was not thrown');
    } catch (err: any) {
      expect(err.message).to.equal('Must provide either userUuid or userEmail');
    }
  });

  it('should return an empty object if no user found', async () => {
    sandbox.stub(DbUser, 'findOne').resolves(null);

    const result = await ctx.authUtils.getUserPermissions(undefined, 'user-email');
    expect(result).to.deep.equal({});
  });

  it('should return an empty object if no group memberships found', async () => {
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([]);

    const result = await ctx.authUtils.getUserPermissions('user-uuid');
    expect(result).to.deep.equal({});
  });

  it('should return an empty object if no permissions found for group UUIDs', async () => {
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'group-1' }] as DbUserGroupMember[]);

    sandbox.stub(DbPermission, 'findAll').resolves([]);

    const result = await ctx.authUtils.getUserPermissions('user-uuid');
    expect(result).to.deep.equal({});
  });

  it('should return compact permissions if permissions exist', async () => {
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'group-1' }, { group_uuid: 'group-2' }] as DbUserGroupMember[]);

    sandbox.stub(DbPermission, 'findAll').resolves([
      { feature_uuid: 'feature-1', scope_element_uuid: 'scope-1', is_deny: false },
      { feature_uuid: 'feature-2', scope_element_uuid: 'scope-2', is_deny: true },
    ] as DbPermission[]);

    sandbox.stub(ctx.featureUtils, 'getHighestFeatures').resolves(['feature-1']);
    sandbox.stub(ctx.authUtils, 'getAllUniqueElement').resolves(['scope-1']);

    const result = await ctx.authUtils.getUserPermissions('user-uuid');
    expect(result).to.deep.equal([
      { f: 'feature-1', e: 'scope-1', d: false, c: 'top.uniq' },
      { f: 'feature-2', e: 'scope-2', d: true },
    ]);
  });

  it('should return compact permissions if permissions exist', async () => {
    sandbox.stub(DbUserGroupMember, 'findAll').resolves([{ group_uuid: 'group-1' }, { group_uuid: 'group-2' }] as DbUserGroupMember[]);

    sandbox.stub(DbPermission, 'findAll').resolves([
      { feature_uuid: 'feature-1', scope_element_uuid: 'scope-1', is_deny: false },
      { feature_uuid: 'feature-2', scope_element_uuid: 'scope-2', is_deny: true },
    ] as DbPermission[]);

    sandbox.stub(ctx.featureUtils, 'getHighestFeatures').resolves(['feature-1']);
    sandbox.stub(ctx.authUtils, 'getAllUniqueElement').resolves(['scope-2']);

    const result = await ctx.authUtils.getUserPermissions('user-uuid');
    expect(result).to.deep.equal([
      { f: 'feature-1', e: 'scope-1', d: false, c: 'top' },
      { f: 'feature-2', e: 'scope-2', d: true, c: 'uniq' },
    ]);
  });

  it('should use email and return compact permissions if permissions exist', async () => {
    sandbox
      .stub(DbUser, 'findOne')
      .withArgs({ where: { email: 'user-email' } })
      .resolves({ uuid: 'user-uuid' } as DbUser);

    sandbox
      .stub(DbUserGroupMember, 'findAll')
      .withArgs({ where: { user_uuid: 'user-uuid' } })
      .resolves([{ group_uuid: 'group-1' }, { group_uuid: 'group-2' }] as DbUserGroupMember[]);

    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group-1', 'group-2'] } })
      .resolves([
        { feature_uuid: 'feature-1', scope_element_uuid: 'scope-1', is_deny: false },
        { feature_uuid: 'feature-2', scope_element_uuid: 'scope-2', is_deny: true },
      ] as DbPermission[]);

    sandbox.stub(ctx.featureUtils, 'getHighestFeatures').resolves(['feature-1']);
    sandbox.stub(ctx.authUtils, 'getAllUniqueElement').resolves(['scope-2']);

    const result = await ctx.authUtils.getUserPermissions(undefined, 'user-email');
    expect(result).to.deep.equal([
      { f: 'feature-1', e: 'scope-1', d: false, c: 'top' },
      { f: 'feature-2', e: 'scope-2', d: true, c: 'uniq' },
    ]);
  });
});
