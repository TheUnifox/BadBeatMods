import { Express } from 'express';
import { DiscordAuthHelper } from '../../shared/AuthHelper';
import { HTTPTools } from '../../shared/HTTPTools';
import { server } from '../../../storage/config.json';
import { DatabaseHelper } from '../../shared/Database';
import { Logger } from '../../shared/Logger';

export class AuthRoutes {
    private app: Express;
    private validStates: string[] = [];

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/auth`, async (req, res) => {
            if (req.session.userId) {
                return res.status(200).send({ message: `Hello, ${req.session.username}!`, username: req.session.username, userId: req.session.userId });
            } else {
                return res.status(401).send({ error: `Not logged in.` });
            }
        });

        this.app.get(`/api/auth/logout`, async (req, res) => {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).send({ error: `Internal server error.` });
                }
                return res.status(200).send(`<head><meta http-equiv="refresh" content="0; url=${server.url}" /></head><body style="background-color: black;"><a style="color:white;" href="${server.url}">Click here if you are not redirected...</a></body>`);
            });
        });

        this.app.get(`/api/auth/discord`, (req, res) => {
            let state = HTTPTools.createRandomString(16);
            this.validStates.push(state + req.ip);
            setTimeout(() => {
                this.validStates = this.validStates.filter((s) => s !== state + req.ip);
            }, 1000 * 60 * 3);

            return res.redirect(302, DiscordAuthHelper.getUrl(state));
        });

        this.app.get(`/api/auth/discord/callback`, async (req, res) => {
            const code = req.query[`code`];
            const state = req.query[`state`];

            if (!code || !state) {
                return res.status(400).send({ error: `Invalid parameters.` });
            }
            if (!this.validStates.includes(state + req.ip)) {
                return res.status(400).send({ error: `Invalid state.` });
            }

            this.validStates = this.validStates.filter((s) => s !== state + req.ip);
            let token = await DiscordAuthHelper.getToken(code.toString());
            if (!token) { return res.status(400).send({ error: `Invalid code.` }); }
            let user = await DiscordAuthHelper.getUser(token.access_token);
            if (!user) { return res.status(500).send({ error: `Internal server error.` }); }

            let userDb = await DatabaseHelper.database.Users.findOne({ where: { discordId: user.id } });

            if (!userDb) {
                userDb = await DatabaseHelper.database.Users.create({
                    discordId: user.id,
                    username: user.username,
                    roles: []
                });
            }

            req.session.userId = userDb.id;
            req.session.username = userDb.username;

            req.session.save();
            Logger.log(`User ${userDb.username} logged in.`, `Auth`);
            return res.status(200).send(`<head><meta http-equiv="refresh" content="0; url=${server.url}/judging" /></head><body style="background-color: black;"><a style="color:white;" href="${server.url}/judging">Click here if you are not redirected...</a></body>`); // i need to double check that this is the correct way to redirect
        });
    }
}