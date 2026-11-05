import { Request } from "express";
import { IAuthOptions } from "../interfaces";

const parse = (value: string, base?: string): URL | null => {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
};

/**
 * Whether a redirect may leave for `target`. Allowed: the auth host itself on any port, the
 * origins of redirectAfterLogin and redirectAfterLogout, and the entries of
 * allowedRedirectHosts. An entry is a host (`app.example.com`, `app.example.com:8443`), reached
 * over https only, or an origin (`http://dev.example.com`), matched with its scheme.
 */
export const isAllowedLanding = (target: URL, req: Request, options: IAuthOptions): boolean => {
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;
  if (target.hostname === req.hostname?.toLowerCase()) return true;
  const configured = [options.redirectAfterLogin, options.redirectAfterLogout]
    .map((url) => (url ? parse(url) : null));
  if (configured.some((url) => url?.origin === target.origin)) return true;
  return (options.allowedRedirectHosts ?? []).some((entry) =>
    entry.includes("://")
      ? parse(entry)?.origin === target.origin
      : target.protocol === "https:" && entry.toLowerCase() === target.host
  );
};

/**
 * The landing a request names, resolved against the auth host: a path stays on it, an absolute
 * URL goes where it says. Null for a value that does not parse or is not allowed.
 */
export const allowedLanding = (value: unknown, req: Request, options: IAuthOptions): URL | null => {
  if (typeof value !== "string" || !value) return null;
  const target = parse(value, `${req.protocol}://${req.get("host")}`);
  return target && isAllowedLanding(target, req, options) ? target : null;
};
