import { RepositorySequelize } from "@all41-dev/server";
import { UserGroup } from "../db/models/user-group";
import { UserGroupMember } from "../db/models/user-group-member";
import { User } from "../db/models/user";

export class RepositoryUserGroup extends RepositorySequelize<UserGroup> {
    constructor(options?: { dbName?: string }) {
        super(UserGroup, options?.dbName);
    }

    public async init() {
        return this;
    }

    public async addUser(userId: string, groupId: string) {
        const user = await User.findOne({ where: {id: userId}});
        const group = await this.getByKey(groupId);
        if (!user) {
            throw new Error(`User with id ${userId} not found`);
        }
        await UserGroupMember.create({
            user_uuid: user.uuid,
            group_uuid: group.uuid
        });
    }

    public async removeUser(userId: string, groupId: string) {
        const user = await User.findOne({ where: {id: userId}});
        const group = await this.getByKey(groupId);
        if (!user) {
            throw new Error(`User with id ${userId} not found`);
        }
        await UserGroupMember.destroy({
            where: {
                user_uuid: user.uuid,
                group_uuid: group.uuid
            }
        });
    }
}