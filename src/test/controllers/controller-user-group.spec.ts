import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { ControllerUserGroup } from '../../api/controllers/controller-user-group';
import { RepositoryUserGroup } from '../../repositories/user-group-repository';
import 'mocha';

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

  describe('addUsers', () => {
    it('should add a single user to a group and return status 200', async () => {
      const userUuids = ['12345'];
      const groupUuid = '67890';

      repositoryUserGroupMock.addUsers.resolves();

      mockRequest = {
        params: { groupUuid: groupUuid },
        body: { userUuids },
      };

      await userGroupController.addUsers(mockRequest as Request, mockResponse as Response);

      expect(repositoryUserGroupMock.addUsers.calledOnceWith(userUuids, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith(`Users: ${userUuids} added to group ${groupUuid}`)).to.be.true;
    });

    it('should add multiple users to a group and return status 200', async () => {
      const userUuids = ['12345', '67890'];
      const groupUuid = '112233';

      repositoryUserGroupMock.addUsers.resolves();

      mockRequest = {
        params: { groupUuid: groupUuid },
        body: { userUuids },
      };

      await userGroupController.addUsers(mockRequest as Request, mockResponse as Response);

      expect(repositoryUserGroupMock.addUsers.calledOnceWith(userUuids, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith(`Users: ${userUuids} added to group ${groupUuid}`)).to.be.true;
    });

    it('should return status 500 on error', async () => {
      const userUuids = ['12345', '67890'];
      const groupUuid = '112233';

      repositoryUserGroupMock.addUsers.rejects(new Error('Database error'));

      mockRequest = {
        params: { groupUuid: groupUuid },
        body: { userUuids },
      };

      await userGroupController.addUsers(mockRequest as Request, mockResponse as Response);

      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });

  describe('removeUsers', () => {
    it('should remove a single user from a group and return status 200', async () => {
      const userUuids = ['12345'];
      const groupUuid = '67890';

      repositoryUserGroupMock.removeUsers.resolves();

      mockRequest = {
        params: { groupUuid: groupUuid },
        body: { userUuids },
      };

      await userGroupController.removeUsers(mockRequest as Request, mockResponse as Response);

      expect(repositoryUserGroupMock.removeUsers.calledOnceWith(userUuids, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith(`Users: ${userUuids} removed from group ${groupUuid}`)).to.be.true;
    });

    it('should remove multiple users from a group and return status 200', async () => {
      const userUuids = ['12345', '67890'];
      const groupUuid = '112233';

      repositoryUserGroupMock.removeUsers.resolves();

      mockRequest = {
        params: { groupUuid: groupUuid },
        body: { userUuids },
      };

      await userGroupController.removeUsers(mockRequest as Request, mockResponse as Response);

      expect(repositoryUserGroupMock.removeUsers.calledOnceWith(userUuids, groupUuid)).to.be.true;
      expect(statusStub.calledOnceWith(200)).to.be.true;
      expect(jsonStub.calledOnceWith(`Users: ${userUuids} removed from group ${groupUuid}`)).to.be.true;
    });

    it('should return status 500 on error', async () => {
      const userUuids = ['12345', '67890'];
      const groupUuid = '112233';

      repositoryUserGroupMock.removeUsers.rejects(new Error('Database error'));

      mockRequest = {
        params: { groupUuid: groupUuid },
        body: { userUuids },
      };

      await userGroupController.removeUsers(mockRequest as Request, mockResponse as Response);

      expect(statusStub.calledOnceWith(500)).to.be.true;
      expect(jsonStub.calledOnceWith({ error: 'Internal server error' })).to.be.true;
    });
  });
});
