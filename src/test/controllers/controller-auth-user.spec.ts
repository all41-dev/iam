import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { ControllerAuthUser } from '../../api/controllers/controller-auth-user';
import { RepositoryAuthUser } from '../../repositories/auth-user-repository';

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

  describe('setUserGroups', () => {
    it('should add groups to a user and return status 200', async () => {
      const userUuid = '12345';
      const groupUuids = ['67890', '54321'];

      repositoryAuthUserMock.addGroups.resolves();

      mockRequest = {
        params: { userUuid },
        body: { groupUuids },
      };

      await controllerAuthUser.setUserGroups(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.addGroups.calledOnceWith(userUuid, groupUuids)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith({})).to.be.true;
    });

    it('should handle errors and return status 500', async () => {
      const userUuid = '12345';
      const groupUuids = ['67890', '54321'];

      repositoryAuthUserMock.addGroups.rejects(new Error('Database error'));

      mockRequest = {
        params: { userUuid },
        body: { groupUuids },
      };

      await controllerAuthUser.setUserGroups(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.addGroups.calledOnceWith(userUuid, groupUuids)).to.be.true;
      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });

  describe('unsetUserGroups', () => {
    it('should remove groups from a user and return status 200', async () => {
      const userUuid = '12345';
      const groupUuids = ['67890', '54321'];

      repositoryAuthUserMock.removeGroups.resolves();

      mockRequest = {
        params: { userUuid },
        body: { groupUuids },
      };

      await controllerAuthUser.unsetUserGroups(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.removeGroups.calledOnceWith(userUuid, groupUuids)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith({})).to.be.true;
    });

    it('should handle errors and return status 500', async () => {
      const userUuid = '12345';
      const groupUuids = ['67890', '54321'];

      repositoryAuthUserMock.removeGroups.rejects(new Error('Database error'));

      mockRequest = {
        params: { userUuid },
        body: { groupUuids },
      };

      await controllerAuthUser.unsetUserGroups(mockRequest as Request, mockResponse as Response);

      expect(repositoryAuthUserMock.removeGroups.calledOnceWith(userUuid, groupUuids)).to.be.true;
      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });

});
