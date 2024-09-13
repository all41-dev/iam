import { RepositorySequelize } from "@all41-dev/server";
import { Permission } from "../db/models/permission";

export class RepositoryPermission extends RepositorySequelize<Permission> {
    constructor(options?: { dbName?: string }) {
        super(Permission, options?.dbName);
    }

    public async init() {
        return this;
    }
}