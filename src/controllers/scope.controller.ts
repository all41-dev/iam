import { ControllerBase } from "@all41-dev/server";
import { Router, Request, Response } from "express";
import { EntityScope } from "../models/business/entity-scope";

export class ScopeController extends ControllerBase {
  public static create(): Router {
    const router = Router();

    router.get('/', ScopeController.checkAccess(['/root']), ScopeController.getAll);
    router.post('/', ScopeController.checkAccess(['/root']), ScopeController.add);
    router.patch('/', ScopeController.checkAccess(['/root']), ScopeController.update);
    router.delete('/', ScopeController.checkAccess(['/root']), ScopeController.remove);
    
    return router;
  }
  
  public static getAll(req: Request, res: Response): void {
  // Since here, the user is considered as authorized
    const entity = new EntityScope();

    // if(req.query.filter && typeof req.query.filter === 'string')
    //   entity.setFilter(req.query.filter);

    // if(req.query.include && (typeof req.query.include === 'string' || (Array.isArray(req.query.include))))
    //   entity.setIncludes(req.query.include);

    entity.get().then((data): void => {
      res.json(data);
    }, (reason): void => {
      res.status(500);
      res.json(reason);
    });
  }
  public static add(req: Request, res: Response): void {
    const entity = new EntityScope();

    entity.post(req.body).then((data): void => {
      res.json(data);
    }, (reason): void => {
      res.status(500);
      res.json(reason);
    });
  }
  public static update(req: Request, res: Response): void {
    const entity = new EntityScope();
    if (!req.params.id) { throw new Error('id parameter must be provided when updating a Ressource'); }
    if (req.params.id !== req.body.uuid) throw ('id param and object uuid don\'t match');

    entity.put(req.body).then((data): void => {
      res.json(data);
    }, (reason): void => {
      res.status(500);
      res.json(reason);
    });
  }
  public static remove(req: Request, res: Response): void {
    const entity = new EntityScope();

    try {
      entity.del(req.params.id, 'uuid');
    } catch (e) {
      const err = e as Error;
      res.statusCode = 400;
      res.send({ message: err.message });
    }
  }
}
