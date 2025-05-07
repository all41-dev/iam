import sinon from 'sinon';
import { ControllerAuthUser } from '../../api/controllers/controller-auth-user';
import { RepositoryAuthUser } from '../../repositories/auth-user-repository';

describe('ControllerAuthUser', () => {
  let controllerAuthUser: ControllerAuthUser;
  let repositoryAuthUserMock: sinon.SinonStubbedInstance<RepositoryAuthUser>;

  beforeEach(() => {
    repositoryAuthUserMock = sinon.createStubInstance(RepositoryAuthUser);

    controllerAuthUser = new ControllerAuthUser();
    controllerAuthUser['repositoryAuthUser'] = repositoryAuthUserMock as unknown as RepositoryAuthUser;


  });

  afterEach(() => {
    sinon.restore();
  });

});
