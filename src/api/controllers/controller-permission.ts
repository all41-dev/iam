import { RequestController } from "@all41-dev/server";
import { Request, Response, Router } from "express";
import { EntityPermission } from "../../models/entities/entity-permission";
import { PermissionTable } from "../../db/permission-table";
import { Permission } from "../../models/permission";

export class ControllerPermission<DbN extends PermissionTable, N extends Permission, T extends EntityPermission<DbN, N>> extends RequestController<T & any> {
  public static inst: any;

  public static create(extRouter?: Router): Router {
    const inst = ControllerPermission.inst = new ControllerPermission(EntityPermission);
    const router = extRouter || Router();

    router.get("/", inst.getAll);
    router.get("/:groupUuid", inst.getByGroup);
    router.post("/", inst.createPermission);
    router.patch("/:uuid", inst.updatePermission);
    router.delete("/:uuid", inst.deletePermission);

    return router;
  }

  public async getAll(req: Request, res: Response): Promise<void> {
    ControllerPermission.inst._getAll(req, res, EntityPermission, PermissionTable);
  }

  public async getByGroup(req: Request, res: Response): Promise<void> {
    const groupUuid = req.params.groupUuid as string;
    try {
      const entity = new EntityPermission(PermissionTable);
      const permissions = await entity.getByGroup(groupUuid);
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async createPermission(req: Request, res: Response): Promise<void> {
    ControllerPermission.inst._create(req, res, EntityPermission, PermissionTable);
  }

  public async updatePermission(req: Request, res: Response): Promise<void> {
    ControllerPermission.inst._update(req, res, EntityPermission, PermissionTable);
  }

  public async deletePermission(req: Request, res: Response): Promise<void> {
    ControllerPermission.inst._delete(req, res, EntityPermission, PermissionTable);
  }

  protected async _getAll(
    req: Request,
    res: Response,
    _entity: typeof EntityPermission,
    tableType: typeof PermissionTable
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
    _entity: typeof EntityPermission,
    tableType: typeof PermissionTable
  ): Promise<void> {
    const entity = new _entity(tableType);
    try {
      const permission = await entity.post(req.body);
      res.status(201).json(permission);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  protected async _update(
    req: Request,
    res: Response,
    _entity: typeof EntityPermission,
    tableType: typeof PermissionTable
  ): Promise<void> {
    if (!req.params.uuid) {
      res.status(400).json({ error: "uuid parameter must be provided when updating a permission" });
      return;
    }
    const entity = new _entity(tableType);
    try {
      const payload = { keyValue: req.params.uuid, receivedObj: req.body };
      const permission = await entity.patch(payload);
      res.json(permission);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  protected async _delete(
    req: Request,
    res: Response,
    _entity: typeof EntityPermission,
    tableType: typeof PermissionTable
  ): Promise<void> {
    if (!req.params.uuid) {
      res.status(400).json({ error: "uuid parameter must be provided when deleting a permission" });
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