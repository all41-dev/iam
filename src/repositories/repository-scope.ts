import { RepositorySequelize } from "@all41-dev/server";
import { Scope } from "../db/models/scope";

export class RepositoryScope extends RepositorySequelize<Scope> {
    constructor(options?: { dbName?: string }) {
        super(Scope, options?.dbName);
    }

    public async init() {
        return this;
    }
}