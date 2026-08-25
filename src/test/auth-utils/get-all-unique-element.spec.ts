import { expect } from 'chai';
import sinon from 'sinon';
import { DbFeature } from '../../db/db-feature';
import { DbScope } from '../../db/db-scope';
import { DbPermission } from '../../db/db-permission';
import { setupAuthUtils } from './helpers';
import 'mocha';

describe('Auth Utils - getAllUniqueElement', () => {
  const ctx = setupAuthUtils();
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should exclude permissions with no scope_element_uuid or feature_uuid', async () => {
    const invalidPermissions = [
      { scope_element_uuid: null, feature_uuid: 'featureUuid1', is_deny: false },
      { scope_element_uuid: 'elementUuid1', feature_uuid: null, is_deny: false },
    ] as unknown as DbPermission[];

    const result = await ctx.authUtils.getAllUniqueElement(invalidPermissions);
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if no feature exist', async () => {
    const permissions = [{ scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false }] as DbPermission[];
    sandbox.stub(DbFeature, 'findByPk').withArgs('featureUuid1').resolves(null);
    const result = await ctx.authUtils.getAllUniqueElement(permissions);
    expect(result).to.deep.equal([]);
  });

  it('should return an empty array if no scope exist', async () => {
    const permissions = [{ scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false }] as DbPermission[];
    sandbox
      .stub(DbFeature, 'findByPk')
      .withArgs('featureUuid1')
      .resolves({ scope_uuid: 'scope1' } as DbFeature);
    sandbox.stub(DbScope, 'findByPk').withArgs('scope1').resolves(null);
    const result = await ctx.authUtils.getAllUniqueElement(permissions);
    expect(result).to.deep.equal([]);
  });

  it('should exclude permissions marked as deny', async () => {
    const permissions = [
      { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
      { scope_element_uuid: 'elementUuid2', feature_uuid: 'featureUuid2', is_deny: true },
    ] as DbPermission[];

    sandbox
      .stub(DbFeature, 'findByPk')
      .withArgs('featureUuid1')
      .resolves({ scope_uuid: 'scope1' } as DbFeature)
      .withArgs('featureUuid2')
      .resolves({ scope_uuid: 'scope2' } as DbFeature);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope1')
      .resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).resolves([]);
    const result = await ctx.authUtils.getAllUniqueElement(permissions);
    expect(result).to.deep.equal(['elementUuid1']);
  });

  it('should return unique elements when no higher elements exist', async () => {
    const permissions = [
      { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
      { scope_element_uuid: 'elementUuid2', feature_uuid: 'featureUuid2', is_deny: false },
    ] as DbPermission[];

    sandbox
      .stub(DbFeature, 'findByPk')
      .withArgs('featureUuid1')
      .resolves({ scope_uuid: 'scope1' } as DbFeature)
      .withArgs('featureUuid2')
      .resolves({ scope_uuid: 'scope2' } as DbFeature);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope1')
      .resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid1').resolves(['elementUuid1']).withArgs('elementUuid2').resolves(['elementUuid2']);

    const result = await ctx.authUtils.getAllUniqueElement(permissions);
    expect(result).to.deep.equal(['elementUuid1', 'elementUuid2']);
  });

  it('should exclude elements that are encompassed by higher elements in the hierarchy', async () => {
    const permissions = [
      { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
      { scope_element_uuid: 'elementUuid2', feature_uuid: 'featureUuid2', is_deny: false },
    ] as DbPermission[];

    sandbox
      .stub(DbFeature, 'findByPk')
      .withArgs('featureUuid1')
      .resolves({ scope_uuid: 'scope1' } as DbFeature)
      .withArgs('featureUuid2')
      .resolves({ scope_uuid: 'scope2' } as DbFeature);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope1')
      .resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid1').resolves(['elementUuid2', 'elementUuid1']).withArgs('elementUuid2').resolves(['elementUuid2']);

    const result = await ctx.authUtils.getAllUniqueElement(permissions);
    expect(result).to.deep.equal(['elementUuid2']);
  });

  it('should include elements that appears more than once', async () => {
    const permissions = [
      { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid1', is_deny: false },
      { scope_element_uuid: 'elementUuid1', feature_uuid: 'featureUuid2', is_deny: false },
    ] as DbPermission[];

    sandbox
      .stub(DbFeature, 'findByPk')
      .withArgs('featureUuid1')
      .resolves({ scope_uuid: 'scope1' } as DbFeature)
      .withArgs('featureUuid2')
      .resolves({ scope_uuid: 'scope2' } as DbFeature);

    sandbox
      .stub(DbScope, 'findByPk')
      .withArgs('scope1')
      .resolves({ uuid: 'scope1', code: 'scopeCode1' } as DbScope)
      .withArgs('scope2')
      .resolves({ uuid: 'scope2', code: 'scopeCode2' } as DbScope);

    (ctx.authUtils.options.scopeElementAncestor as sinon.SinonStub).withArgs('elementUuid1').resolves(['elementUuid1']);

    const result = await ctx.authUtils.getAllUniqueElement(permissions);
    expect(result).to.deep.equal(['elementUuid1']);
  });
});
