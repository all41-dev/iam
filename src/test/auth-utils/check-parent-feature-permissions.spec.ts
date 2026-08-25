import { expect } from 'chai';
import sinon from 'sinon';
import { DbFeature } from '../../db/db-feature';
import { DbPermission } from '../../db/db-permission';
import { DbScope } from '../../db/db-scope';
import { DbFeatureComposition } from '../../db/db-feature-composition';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - checkParentFeaturePermissions', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  const featureUuid = 'childFeature';
  const groupUUIDs = ['group1'];
  const elementUuid = 'elementUuid';
  const hierarchyUUIDs = ['elementUuid', 'anotherUuid'];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return null if featureUuid is already visited', async () => {
    const visited = new Set<string>();
    visited.add(featureUuid);
    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs, visited);
    expect(result).to.be.null;
  });

  it('should return null if no compositions exist', async () => {
    sandbox.stub(DbFeatureComposition, 'findAll').resolves([]);
    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    expect(result).to.be.null;
  });

  it('should return null if no feature exist', async () => {
    sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);
    sandbox.stub(DbFeature, 'findOne').resolves(null);
    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    expect(result).to.be.null;
  });

  it('should return null if no scope exist', async () => {
    sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);
    sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
    sandbox.stub(DbScope, 'findOne').resolves(null);
    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    expect(result).to.be.null;
  });

  it('should return "deny" when a parent permission denies access', async () => {
    sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);
    sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
    sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    expect(result).to.equal('deny');
  });

  it('should return "grant" when a parent permission grants access', async () => {
    sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: false, scope_element_uuid: elementUuid }] as DbPermission[]);
    sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
    sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    expect(result).to.equal('grant');
  });

  it('should evaluate nested ancestor permissions and return "deny" if any ancestor denies access', async () => {
    const compositionsStub = sandbox.stub(DbFeatureComposition, 'findAll');
    compositionsStub.withArgs({ where: { child_uuid: featureUuid } }).resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
    compositionsStub.withArgs({ where: { child_uuid: 'parentFeature' } }).resolves([{ parent_uuid: 'grandparentFeature' }] as DbFeatureComposition[]);
    compositionsStub.callsFake(() => Promise.resolve([]));

    const permissionStub = sandbox.stub(DbPermission, 'findAll');
    permissionStub.withArgs({ where: { feature_uuid: 'parentFeature', group_uuid: groupUUIDs } }).resolves([{ is_deny: false, scope_element_uuid: 'otherElementUuid' }] as DbPermission[]);
    permissionStub.withArgs({ where: { feature_uuid: 'grandparentFeature', group_uuid: groupUUIDs } }).resolves([{ is_deny: true, scope_element_uuid: elementUuid }] as DbPermission[]);

    sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
    sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    expect(result).to.equal('deny');
  });

  it('should return null when a no permission with correpsonding element found', async () => {
    sandbox.stub(DbFeatureComposition, 'findAll').resolves([{ parent_uuid: 'parentFeature' }] as DbFeatureComposition[]);
    sandbox.stub(DbPermission, 'findAll').resolves([{ is_deny: true, scope_element_uuid: 'differentElementUuid' }] as DbPermission[]);
    sandbox.stub(DbFeature, 'findOne').resolves({ uuid: featureUuid, scope_uuid: 'scope1' } as DbFeature);
    sandbox.stub(DbScope, 'findOne').resolves({ uuid: 'scope1', code: 'scopeCode' } as DbScope);

    const result = await ctx.authUtils.checkParentFeaturePermissions(featureUuid, groupUUIDs, elementUuid, hierarchyUUIDs);
    expect(result).to.equal(null);
  });
});
