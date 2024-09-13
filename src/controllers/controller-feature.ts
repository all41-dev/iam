import { ControllerRepositoryReadWrite } from "@all41-dev/server";
import { RepositoryFeature } from "../repositories/repository-feature";
import { Router, Request, Response } from "express";

export class ControllerFeature extends ControllerRepositoryReadWrite<RepositoryFeature> {
    private repositoryFeature: RepositoryFeature;

    public static create(): Router {
        return new ControllerFeature().create(RepositoryFeature);
    }

    constructor() {
        super();
        this.repositoryFeature = new RepositoryFeature();

        this.setParentChild = this.setParentChild.bind(this);

        this.defineRoutes({ verb: 'post', path: '/set-parent-child', handlers: this.setParentChild });
    }

    public async setParentChild(req: Request, res: Response) {
        const parentId = req.body.parentUuid;
        const childId = req.body.childUuid;
        try {
            await this.setParentChild(parentId, childId);
            res.status(200).json({});
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    
    public async removeParentChild(req: Request, res: Response) {
        const parentId = req.body.parentUuid;
        const childId = req.body.childUuid;
        try {
            await this.removeParentChild(parentId, childId);
            res.status(200).json({});
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    
}