import { ControllerRepositoryReadWrite } from "@all41-dev/server";
import { RepositoryPermission } from "../repositories/repository-permission";
import { Router } from "express";

export class ControllerPermission extends ControllerRepositoryReadWrite<RepositoryPermission> {
    private repositoryPermission: RepositoryPermission;

    public static create(): Router {
        return new ControllerPermission().create(RepositoryPermission);
    }

    constructor() {
        super();
        this.repositoryPermission = new RepositoryPermission();
    }
    
}