import { AuthUtils } from "../auth/auth-utils";
import { Request, Response, NextFunction } from "express";
import { IAMUser } from "../interfaces";

export function checkRouteMiddleware(
  featureCode: string,
) {
  const authUtils = AuthUtils.getInstance();
  return async (req: Request, res: Response, next: NextFunction) => {
    const elementUuid = process.env.GLOBAL_UUID;
    if (
      (!req.user ||
        !elementUuid ||
        await authUtils.checkAccess((req.user as IAMUser).email, featureCode, elementUuid) === "deny")
      && !(process.env.DISABLE_AUTH === 'true')
    ) {
      res.status(403).send("Forbidden");
      return;
    }
    next();
  };
}
