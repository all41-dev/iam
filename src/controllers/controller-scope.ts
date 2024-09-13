import { ControllerRepositoryReadWrite } from "@all41-dev/server";
import { RepositoryScope } from "../repositories/repository-scope";
import { Router } from "express";

export class ControllerScope extends ControllerRepositoryReadWrite<RepositoryScope> {
    private repositoryScope: RepositoryScope;

    public static create(): Router {
        return new ControllerScope().create(RepositoryScope);
    }

    constructor() {
        super();
        this.repositoryScope = new RepositoryScope();
    }
    
}