import { Router } from 'express';
import { DiscordAuthHelper, GitHubAuthHelper, validateSession } from '../../shared/AuthHelper';
import { HTTPTools } from '../../shared/HTTPTools';
import { DatabaseHelper } from '../../shared/Database';
import { Logger } from '../../shared/Logger';
import { Config } from '../../shared/Config';
import { Validator } from '../../shared/Validator';

export class AuthRoutes {
    private router: Router;
    private validStates: {stateId: string, ip: string, redirectUrl: URL, userId: number}[] = [];

    constructor(router: Router) {
        this.router = router;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.router.get(`/auth`, async (req, res) => {
            // #swagger.tags = ['Auth']
            // #swagger.summary = 'Get logged in user information.'
            // #swagger.description = 'Get user information.'
            // #swagger.responses[200] = { description: 'Returns user information.' }
            // #swagger.responses[401] = { description: 'Unauthorized.' }
            let session = await validateSession(req, res, false);
            if (!session.approved) {
                return;
            }
            return res.status(200).send({ message: `Hello, ${session.user.username}!`, username: session.user.username, userId: session.user.id, roles: session.user.roles });
        });

        this.router.get(`/auth/logout`, async (req, res) => {
            // #swagger.tags = ['Auth']
            // #swagger.summary = 'Logout.'
            // #swagger.description = 'Logout.'
            // #swagger.responses[200] = { description: 'Logout successful.' }
            // #swagger.responses[500] = { description: 'Internal server error.' }
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).send({ error: `Internal server error.` });
                }
                return res.status(200).send(`<head><meta http-equiv="refresh" content="0; url=${Config.server.url}" /></head><body style="background-color: black;"><a style="color:white;" href="${Config.server.url}">Click here if you are not redirected...</a></body>`);
            });
        });

        this.router.get(`/auth/github`, async (req, res) => {
            // #swagger.tags = ['Auth']
            let state = this.prepAuth(req);
            if (!state) {
                return res.status(400).send({ error: `Invalid parameters.` });
            }
            return res.redirect(302, GitHubAuthHelper.getUrl(state));
        });

        this.router.get(`/auth/github/callback`, async (req, res) => {
            // #swagger.tags = ['Auth']
            let reqQuery = Validator.zOAuth2Callback.safeParse(req.query);
            if (!reqQuery.success) {
                return res.status(400).send({ error: `Invalid parameters.` });
            }

            let stateObj = this.validStates.find((s) => s.stateId === reqQuery.data.state && s.ip === req.ip);

            if (!stateObj) {
                return res.status(400).send({ error: `Invalid state.` });
            }

            this.validStates = this.validStates.filter((s) => s.stateId !== reqQuery.data.state);

            let token = await GitHubAuthHelper.getToken(reqQuery.data.code.toString());
            if (!token) { return res.status(400).send({ error: `Invalid code.` }); }
            let user = await GitHubAuthHelper.getUser(token.access_token);
            if (!user) { return res.status(500).send({ error: `Internal server error.` }); }

            let userDb = await DatabaseHelper.database.Users.findOne({ where: { githubId: user.id.toString() } });
            if (!userDb) {
                userDb = await DatabaseHelper.database.Users.create({
                    username: user.login,
                    githubId: user.id.toString(),
                    roles: {
                        sitewide: [],
                        perGame: {},
                    },
                    discordId: null,
                    displayName: user.login,
                    bio: `${user.bio} `,
                });

                Logger.log(`User ${user.login} signed up.`, `Auth`);
            }

            req.session.userId = userDb.id;
            req.session.save();

            Logger.log(`User ${userDb.username} logged in.`, `Auth`);
            return res.status(200).send(`<head><meta http-equiv="refresh" content="0; url=${stateObj.redirectUrl.href}" /></head><body style="background-color: black;"><a style="color:white;" href="${stateObj.redirectUrl.href}">Click here if you are not redirected...</a></body>`); // i need to double check that this is the correct way to redirect
        });

        this.router.get(`/link/discord`, async (req, res) => {
            // #swagger.tags = ['Auth']
            let session = await validateSession(req, res, false);
            if (!session.approved) {
                return;
            }
            let state = this.prepAuth(req, session.user.id);
            if (!state) {
                return res.status(400).send({ error: `Invalid parameters.` });
            }
            return res.redirect(302, DiscordAuthHelper.getUrl(state));
        });

        this.router.get(`/link/discord/callback`, async (req, res) => {
            // #swagger.tags = ['Auth']
            let reqQuery = Validator.zOAuth2Callback.safeParse(req.query);
            if (!reqQuery.success) {
                return res.status(400).send({ error: `Invalid parameters.` });
            }

            let stateObj = this.validStates.find((s) => s.stateId === reqQuery.data.state && s.ip === req.ip);

            if (!stateObj) {
                return res.status(400).send({ error: `Invalid state.` });
            }

            this.validStates = this.validStates.filter((s) => s.stateId !== reqQuery.data.state);

            let token = await DiscordAuthHelper.getToken(reqQuery.data.code.toString());
            if (!token) { return res.status(400).send({ error: `Invalid code.` }); }
            let user = await DiscordAuthHelper.getUser(token.access_token);
            if (!user) { return res.status(500).send({ error: `Internal server error.` }); }

            let userDb = await DatabaseHelper.database.Users.findOne({ where: { githubId: stateObj.userId.toString() } });

            if (!userDb) {
                return res.status(400).send({ error: `Discord auth suscessful, however user could not be found.` });
            } else {
                userDb.discordId = user.id;
                userDb.save();
            }

            Logger.log(`User ${userDb.username} linked their discord.`, `Auth`);
            return res.status(200).send(`<head><meta http-equiv="refresh" content="0; url=${stateObj.redirectUrl.href}" /></head><body style="background-color: black;"><a style="color:white;" href="${stateObj.redirectUrl.href}">Click here if you are not redirected...</a></body>`); // i need to double check that this is the correct way to redirect
        });
    }

    private prepAuth(req: any, userId?: number): string|null {
        let redirect = Validator.zUrl.default(Config.server.url).safeParse(req.query[`redirect`]);
        if (!redirect.success) {
            return null;
        }
        let state = HTTPTools.createRandomString(64);
        if (userId) {
            this.validStates.push({stateId: state, ip: req.ip, redirectUrl: new URL(redirect.data), userId});
        } else {
            this.validStates.push({stateId: state, ip: req.ip, redirectUrl: new URL(redirect.data), userId: null});
        }
        setTimeout(() => {
            this.validStates = this.validStates.filter((s) => s.stateId !== state);
        }, 1000 * 60 * 3);
        return state;
    }
}