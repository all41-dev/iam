import sinon from 'sinon';
import { ControllerUser } from '../../api/controllers/controller-user';
import { RepositoryUser } from '../../repositories/user-repository';
import 'mocha';

describe('ControllerUser', () => {
  let controllerUser: ControllerUser;
  let repositoryUserMock: sinon.SinonStubbedInstance<RepositoryUser>;

  beforeEach(() => {
    repositoryUserMock = sinon.createStubInstance(RepositoryUser);

    controllerUser = new ControllerUser();
    controllerUser['repositoryUser'] = repositoryUserMock as unknown as RepositoryUser;


  });

  afterEach(() => {
    sinon.restore();
  });

});
