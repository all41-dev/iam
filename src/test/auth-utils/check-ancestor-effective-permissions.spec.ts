import { expect } from 'chai';
import sinon from 'sinon';
import { DbFeature } from '../../db/db-feature';
import { DbPermission } from '../../db/db-permission';
import { DbFeatureComposition } from '../../db/db-feature-composition';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - checkAncestorEffectivePermissions', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return no permissions if feature has no parents', async () => {
    sandbox.stub(DbFeatureComposition, 'findAll').resolves([]);

    const result = await ctx.authUtils.checkAncestorEffectivePermissions('featureUuid', ['groupUuid']);
    expect(result).to.deep.equal({ inherited: false, permissions: [] });
  });

  it('should return permissions from direct parent feature', async () => {
    const fakeComposition = [{ child_uuid: 'featureUuid', parent_uuid: 'parent-feature-uuid' }] as DbFeatureComposition[];

    const fakeFeature = {
      code: 'PARENT_FEATURE',
      scope_uuid: 'parent-scope-uuid',
    } as DbFeature;

    const fakePermissions = [{ scope_element_uuid: 'scope-element-1', is_deny: false }] as DbPermission[];

    sandbox
      .stub(DbFeatureComposition, 'findAll')
      .withArgs({ where: { child_uuid: 'featureUuid' } })
      .resolves(fakeComposition)
      .withArgs({ where: { child_uuid: 'parent-feature-uuid' } })
      .resolves([]);
    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { feature_uuid: 'parent-feature-uuid', group_uuid: ['groupUuid'] } })
      .resolves(fakePermissions);
    sandbox.stub(DbFeature, 'findByPk').withArgs('parent-feature-uuid').resolves(fakeFeature);

    const result = await ctx.authUtils.checkAncestorEffectivePermissions('featureUuid', ['groupUuid']);

    expect(result).to.deep.equal({
      inherited: true,
      permissions: [
        {
          scope_element_uuid: 'scope-element-1',
          scope_uuid: 'parent-scope-uuid',
          feature_code: 'PARENT_FEATURE',
          is_deny: false,
        },
      ],
    });
  });

  it('should return inherited permissions from grandparent feature', async () => {
    const parentRelation = [{ child_uuid: 'featureUuid', parent_uuid: 'parent-feature-uuid' }] as DbFeatureComposition[];
    const grandparentRelation = [{ child_uuid: 'parent-feature-uuid', parent_uuid: 'grandparent-feature-uuid' }] as DbFeatureComposition[];

    const parentFeature = {
      uuid: 'parent-feature-uuid',
      code: 'PARENT_FEATURE',
      scope_uuid: 'parent-scope-uuid',
    } as DbFeature;

    const grandparentFeature = {
      uuid: 'grandparent-feature-uuid',
      code: 'GRANDPARENT_FEATURE',
      scope_uuid: 'grandparent-scope-uuid',
    } as DbFeature;

    const directPermissions = [] as DbPermission[];

    const inheritedPermissions = [{ scope_element_uuid: 'scope-element-2', is_deny: true }] as DbPermission[];

    sandbox
      .stub(DbFeatureComposition, 'findAll')
      .withArgs({ where: { child_uuid: 'featureUuid' } })
      .resolves(parentRelation)
      .withArgs({ where: { child_uuid: 'parent-feature-uuid' } })
      .resolves(grandparentRelation)
      .withArgs({ where: { child_uuid: 'grandparent-feature-uuid' } })
      .resolves([]);

    sandbox
      .stub(DbPermission, 'findAll')
      .withArgs({ where: { feature_uuid: 'featureUuid', group_uuid: ['groupUuid'] } })
      .resolves(directPermissions)
      .withArgs({ where: { feature_uuid: 'parent-feature-uuid', group_uuid: ['groupUuid'] } })
      .resolves([])
      .withArgs({ where: { feature_uuid: 'grandparent-feature-uuid', group_uuid: ['groupUuid'] } })
      .resolves(inheritedPermissions);

    sandbox.stub(DbFeature, 'findByPk').withArgs('parent-feature-uuid').resolves(parentFeature).withArgs('grandparent-feature-uuid').resolves(grandparentFeature);

    const result = await ctx.authUtils.checkAncestorEffectivePermissions('featureUuid', ['groupUuid']);

    expect(result).to.deep.equal({
      inherited: true,
      permissions: [
        {
          scope_element_uuid: 'scope-element-2',
          scope_uuid: 'grandparent-scope-uuid',
          feature_code: 'GRANDPARENT_FEATURE',
          is_deny: true,
        },
      ],
    });
  });
});
