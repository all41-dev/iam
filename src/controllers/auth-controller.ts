import { Router } from 'express';
import passport, { Strategy } from 'passport';
import { AuthManager } from '../auth';
import querystring from 'querystring';

export class AuthController {

    private _authManager: AuthManager;

    constructor() {
        this._authManager = AuthManager.getInstance();
    }

    public create(strategies : string[], router?: Router): Router {
        const r = router || Router();

        strategies.forEach((strategy) => {
            r.get(`/${strategy}`, (req, res, next) => {
                const redirectUri = req.query.redirectUrl;
                const failureRedirect = req.query.failureRedirect;
                if (redirectUri) {
                    res.cookie('redirect', redirectUri, { maxAge: 5 * 60 * 1000 });
                }
                if (failureRedirect) {
                    res.cookie('failureRedirect', failureRedirect, { maxAge: 5 * 60 * 1000 });
                }
                next();
            }, passport.authenticate(strategy, { session: false }));

            r.get(`/${strategy}/callback`, (req, res, next) => {
                const failureRedirect = req.cookies.failureRedirect || AuthManager.getInstance().options.redirectAfterLogout;
                passport.authenticate(strategy, { session: false }, (err : any, user : any, info : any) => {
                    if (err) {
                        return res.status(401).json({ message: err.message });
                    }
                    if (!user) {
                        const query = querystring.stringify({ message: info.message });
                        res.clearCookie('failureRedirect');
                        res.clearCookie('redirect');
                        return res.redirect(`${failureRedirect}?${query}`);
                    }
                    req.user = user;
                    next();
                }
                )(req, res, next);
            });
        });

        r.get('/logout', (req, res) => {
            res.clearCookie('auth');
            res.clearCookie('refresh');
            res.redirect(AuthManager.getInstance().options.redirectAfterLogin || '/');
        });

        r.post('/refresh', (req, res) => {
            const refreshToken = req.cookies.refresh;
            if (refreshToken) {
                res.cookie('refresh', refreshToken, { maxAge: 0 });
            }
            res.status(200).send();
        });

        return r;
    }

}