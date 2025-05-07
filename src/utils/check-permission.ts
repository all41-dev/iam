import { AuthUtils } from "../auth/auth-utils";
import { Request, Response, NextFunction } from "express";
import { Server } from "@all41-dev/server";

export function checkPermission(
  featureCode: string,
) {
  const authUtils = AuthUtils.getInstance();
  return async (req: Request, res: Response, next: NextFunction) => {
    const elementUuid = process.env.GLOBAL_UUID;
    if (
      (!req.user ||
        !elementUuid ||
        await authUtils.checkAccess((req.user as any).user.email, featureCode, elementUuid) === "deny")
      && !(process.env.DISABLE_AUTH === 'true')
    ) {
      res.status(403).send("Forbidden");
      return;
    }
    next();
  };
}
