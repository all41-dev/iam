import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { ControllerUserGroup } from '../api/controllers/controller-user-group';
import { RepositoryUserGroup } from '../repositories/user-group-repository';

describe('UserGroup Controller', () => {
  let userGroupController: ControllerUserGroup;
  let repositoryUserGroupMock: sinon.SinonStubbedInstance<RepositoryUserGroup>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;

  beforeEach(() => {
    repositoryUserGroupMock = sinon.createStubInstance(RepositoryUserGroup);
    userGroupController = new ControllerUserGroup();
    userGroupController['repositoryUserGroup'] = repositoryUserGroupMock as unknown as RepositoryUserGroup;

    jsonStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: jsonStub } as unknown);

    mockResponse = {
      status: statusStub,
    } as Partial<Response>;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('addUser', () => {
    it('should add a user to a group and return status 200', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryUserGroupMock.addUser.resolves();

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await userGroupController.addUser(mockRequest as Request, mockResponse as Response);

      expect(repositoryUserGroupMock.addUser.calledOnceWith(userUuid, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith({ userUuid, groupUuid })).to.be.true;
    });

    it('should return status 500 on error', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryUserGroupMock.addUser.rejects(new Error('Database error'));

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await userGroupController.addUser(mockRequest as Request, mockResponse as Response);

      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });

  describe('removeUser', () => {
    it('should remove a user from a group and return status 200', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryUserGroupMock.removeUser.resolves();

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await userGroupController.removeUser(mockRequest as Request, mockResponse as Response);

      expect(repositoryUserGroupMock.removeUser.calledOnceWith(userUuid, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith({})).to.be.true;
    });

    it('should return status 500 on error', async () => {
      const userUuid = '12345';
      const groupUuid = '67890';

      repositoryUserGroupMock.removeUser.rejects(new Error('Database error'));

      mockRequest = {
        params: { id: userUuid },
        body: { groupUuid },
      };

      await userGroupController.removeUser(mockRequest as Request, mockResponse as Response);

      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });
});
