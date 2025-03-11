import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { ControllerAuthUser } from '../api/controllers/controller-auth-user';
import { RepositoryAuthUser } from '../repositories/auth-user-repository';

describe('ControllerAuthUser', () => {
  let controllerAuthUser: ControllerAuthUser;
  let repositoryAuthUserMock: sinon.SinonStubbedInstance<RepositoryAuthUser>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;

  beforeEach(() => {
    repositoryAuthUserMock = sinon.createStubInstance(RepositoryAuthUser);

    controllerAuthUser = new ControllerAuthUser();
    controllerAuthUser['repositoryAuthUser'] = repositoryAuthUserMock as unknown as RepositoryAuthUser;

    jsonStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: jsonStub } as unknown);

    mockResponse = {
      status: statusStub,
    } as Partial<Response>;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('setUserGroup', () => {
    it('should add a user to a group and return status 200', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryAuthUserMock.addGroup.resolves();

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await controllerAuthUser.setUserGroup(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.addGroup.calledOnceWith(userUuid, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith({})).to.be.true;
    });

    it('should handle errors and return status 500', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryAuthUserMock.addGroup.rejects(new Error('Database error'));

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await controllerAuthUser.setUserGroup(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.addGroup.calledOnceWith(userUuid, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });

  describe('unsetUserGroup', () => {
    it('should remove a user from a group and return status 200', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryAuthUserMock.removeGroup.resolves();

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await controllerAuthUser.unsetUserGroup(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.removeGroup.calledOnceWith(userUuid, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith({})).to.be.true;
    });

    it('should handle errors and return status 500', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryAuthUserMock.removeGroup.rejects(new Error('Database error'));

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await controllerAuthUser.unsetUserGroup(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.removeGroup.calledOnceWith(userUuid, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });
});
