import sinon from 'sinon';
import { AuthUtils } from '../../auth/auth-utils';
import { FeatureUtils } from '../../auth/feature-utils';
import { IUtilsOptions } from '../../interfaces';

export function setupAuthUtils() {
  let sandbox: sinon.SinonSandbox;
  let mockOptions: IUtilsOptions;
  let authUtils: AuthUtils;
  let featureUtils: FeatureUtils;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockOptions = {
      scopeElementAncestor: sandbox.stub().resolves(['someElementUuid']),
      scopeElementHierarchy: sandbox.stub().resolves([]),
    };
    authUtils = AuthUtils.getInstance(mockOptions);
    featureUtils = FeatureUtils.getInstance();
  });

  afterEach(() => {
    sandbox.restore();
  });

  return {
    get sandbox() {
      return sandbox;
    },
    get mockOptions() {
      return mockOptions;
    },
    get authUtils() {
      return authUtils;
    },
    get featureUtils() {
      return featureUtils;
    },
  };
}
