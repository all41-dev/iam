import { CookieOptions, Request, Response } from "express";
import { IAuthOptions } from "../interfaces";

const LANDING_COOKIE_LIFETIME = 5 * 60 * 1000;
const PROVIDER_COOKIE_MARGIN = 15 * 60 * 1000;

export type LandingCookie = "redirect" | "failureRedirect";

/**
 * Attributes of every cookie the auth router sets or clears; a clear must repeat them. Lax and
 * never Strict: the provider's callback is a cross-site navigation and must carry the landing
 * cookies. Secure follows the request, which reads the forwarded scheme behind a trusted proxy.
 */
const attributes = (req: Request, httpOnly: boolean): CookieOptions => ({
  path: "/",
  sameSite: "lax",
  secure: Boolean(req.secure),
  httpOnly,
});

const tokenAttributes = (req: Request, options: IAuthOptions): CookieOptions =>
  attributes(req, options.httpOnlyTokens === true);

export const setAccessCookie = (
  req: Request, res: Response, options: IAuthOptions, accessToken: string, maxAge: number
): void => {
  res.cookie("auth", accessToken, { ...tokenAttributes(req, options), maxAge });
};

export const setRefreshCookie = (
  req: Request, res: Response, options: IAuthOptions, refreshToken: string, maxAge: number
): void => {
  res.cookie("refresh", refreshToken, { ...tokenAttributes(req, options), maxAge });
};

/** The provider name stays readable by scripts: fronts show it and pick their sign-out by it. */
export const setProviderCookie = (req: Request, res: Response, provider: string, refreshMaxAge: number): void => {
  res.cookie("provider", provider, { ...attributes(req, false), maxAge: refreshMaxAge + PROVIDER_COOKIE_MARGIN });
};

export const clearSessionCookies = (req: Request, res: Response, options: IAuthOptions): void => {
  res.clearCookie("auth", tokenAttributes(req, options));
  res.clearCookie("refresh", tokenAttributes(req, options));
  res.clearCookie("provider", attributes(req, false));
};

export const setLandingCookie = (req: Request, res: Response, name: LandingCookie, value: string): void => {
  res.cookie(name, value, { ...attributes(req, true), maxAge: LANDING_COOKIE_LIFETIME });
};

export const clearLandingCookie = (req: Request, res: Response, name: LandingCookie): void => {
  res.clearCookie(name, attributes(req, true));
};
