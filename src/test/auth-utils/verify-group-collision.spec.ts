import { expect } from 'chai';
import sinon from 'sinon';
import { DbFeature } from '../../db/db-feature';
import { DbPermission } from '../../db/db-permission';
import { DbScope } from '../../db/db-scope';
import { DbUserGroup } from '../../db/db-user-group';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - verifyGroupCollision', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should throw an error if scope does not exist ', async () => {
    sandbox
      .stub(DbUserGroup, 'findAll')
      .withArgs({ where: { uuid: ['group1'] } })
      .resolves([{ uuid: 'group1' }] as DbUserGroup[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] } })
      .resolves([{ feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }] as DbPermission[]);
    sandbox
      .stub(DbFeature, 'findOne')
      .withArgs({ where: { uuid: 'feature1' } })
      .resolves({ scope_uuid: 'scopeA' } as DbFeature);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { uuid: 'scopeA' } })
      .resolves(null);

    try {
      await ctx.authUtils.verifyGroupCollision(['group1']);
      throw new Error('Test failed: error was not thrown');
    } catch (err: any) {
      expect(err.message).to.equal('No scope found');
    }
  });

  it('should skip if feature does not exist ', async () => {
    sandbox
      .stub(DbUserGroup, 'findAll')
      .withArgs({ where: { uuid: ['group1'] } })
      .resolves([{ uuid: 'group1' }] as DbUserGroup[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] } })
      .resolves([{ feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }] as DbPermission[]);
    sandbox
      .stub(DbFeature, 'findOne')
      .withArgs({ where: { uuid: 'feature1' } })
      .resolves(null);

    const result = await ctx.authUtils.verifyGroupCollision(['group1']);
    expect(result).to.deep.equal([]);
  });

  it('should return conflicts when grant is overridden by deny', async () => {
    sandbox
      .stub(DbUserGroup, 'findAll')
      .withArgs({ where: { uuid: ['group1'] } })
      .resolves([{ uuid: 'group1' }] as DbUserGroup[]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { group_uuid: ['group1'] } })
      .resolves([{ feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }] as DbPermission[]);
    sandbox
      .stub(DbFeature, 'findOne')
      .withArgs({ where: { uuid: 'feature1' } })
      .resolves({ scope_uuid: 'scopeA' } as DbFeature);
    sandbox
      .stub(DbScope, 'findOne')
      .withArgs({ where: { uuid: 'scopeA' } })
      .resolves({ code: 'scope_code' } as DbScope);
    sandbox.stub(ctx.authUtils, 'checkParentFeaturePermissions').resolves('deny');

    const result = await ctx.authUtils.verifyGroupCollision(['group1']);
    expect(result).to.deep.equal([
      {
        conflictType: 'grant_overridden_by_deny',
        permissions: [{ feature_uuid: 'feature1', is_deny: false, scope_element_uuid: 'scope1' }],
      },
    ]);
  });
});
