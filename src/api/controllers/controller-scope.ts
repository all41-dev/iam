import { RequestController } from "@all41-dev/server";
import { Request, Response, Router } from "express";
import { EntityScope } from "../../models/entities/entity-scope";
import { ScopeTable } from "../../db/scope-table";
import { Scope } from "../../models/scope";

export class ControllerScope<DbN extends ScopeTable, N extends Scope, T extends EntityScope<DbN, N>> extends RequestController<T & any> {
  public static inst: any;

  public static create(extRouter?: Router): Router {
    const inst = ControllerScope.inst = new ControllerScope(EntityScope);
    const router = extRouter || Router();

    router.get("/", inst.getAll);
    router.get("/:groupUuid", inst.getByGroup);
    router.post("/", inst.createScope);
    router.patch("/:uuid", inst.updateScope);
    router.delete("/:uuid", inst.deleteScope);

    return router;
  }

  public async getAll(req: Request, res: Response): Promise<void> {
    ControllerScope.inst._getAll(req, res, EntityScope, ScopeTable);
  }

  public async getByGroup(req: Request, res: Response): Promise<void> {
    const groupUuid = req.params.groupUuid as string;
    try {
      const entity = new EntityScope(ScopeTable);
      const scopes = await entity.getByGroup(groupUuid);
      res.json(scopes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async createScope(req: Request, res: Response): Promise<void> {
    ControllerScope.inst._create(req, res, EntityScope, ScopeTable);
  }

  public async updateScope(req: Request, res: Response): Promise<void> {
    ControllerScope.inst._update(req, res, EntityScope, ScopeTable);
  }

  public async deleteScope(req: Request, res: Response): Promise<void> {
    ControllerScope.inst._delete(req, res, EntityScope, ScopeTable);
  }

  protected async _getAll(
    req: Request,
    res: Response,
    _entity: typeof EntityScope,
    tableType: typeof ScopeTable
  ): Promise<void> {
    const entity = new _entity(tableType);
    try {
      const data = await entity.get();
      res.json(data);
    } catch (reason: any) {
      res.status(500).json({ error: reason.message });
    }
  }

  protected async _create(
    req: Request,
    res: Response,
    _entity: typeof EntityScope,
    tableType: typeof ScopeTable
  ): Promise<void> {
    const entity = new _entity(tableType);
    try {
      const scope = await entity.post(req.body);
      res.status(201).json(scope);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  protected async _update(
    req: Request,
    res: Response,
    _entity: typeof EntityScope,
    tableType: typeof ScopeTable
  ): Promise<void> {
    if (!req.params.uuid) {
      res.status(400).json({ error: "uuid parameter must be provided when updating a scope" });
      return;
    }
    const entity = new _entity(tableType);
    try {
      const payload = { keyValue: req.params.uuid, receivedObj: req.body };
      const scope = await entity.patch(payload);
      res.json(scope);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  protected async _delete(
    req: Request,
    res: Response,
    _entity: typeof EntityScope,
    tableType: typeof ScopeTable
  ): Promise<void> {
    if (!req.params.uuid) {
      res.status(400).json({ error: "uuid parameter must be provided when deleting a scope" });
      return;
    }
    const entity = new _entity(tableType);
    try {
      await entity.del(req.params.uuid);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
