import { Express } from 'express';
import { DatabaseHelper, GameVersion, SupportedGames, UserRoles } from '../../shared/Database';
import { HTTPTools } from '../../shared/HTTPTools';
import { validateSession } from '../../shared/AuthHelper';
import { User } from 'discord.js';

export class VersionsRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/versions`, async (req, res) => {
            // #swagger.tags = ['Versions']
            let versions = DatabaseHelper.cache.gameVersions;

            return res.status(200).send({ versions });
        });

        this.app.get(`/api/versions/default`, async (req, res) => {
            // #swagger.tags = ['Versions']
            let gameName = req.query.gameName && HTTPTools.validateStringParameter(req.query.gameName) && DatabaseHelper.isValidGameName(req.query.gameName) ? req.query.gameName : SupportedGames.BeatSaber;
            
            let defaultVersion = await GameVersion.getDefaultVersionObject(gameName);

            return res.status(200).send({ defaultVersion });
        });

        this.app.post(`/api/versions/default`, async (req, res) => {
            // #swagger.tags = ['Versions']
            // #swagger.parameters['gameVersionId'] = { description: 'The ID of the version to set as default', type: 'number' }
            let gameVersionId = req.body.gameVersionId;

            if (!gameVersionId || !HTTPTools.validateNumberParameter(gameVersionId)) {
                return res.status(400).send({ message: `Invalid gameVersionId` });
            }

            let gameVersion = await DatabaseHelper.database.GameVersions.findOne({ where: { id: gameVersionId } });
            if (!gameVersion) {
                return res.status(404).send({ message: `GameVersion not found` });
            }

            let session = validateSession(req, res, UserRoles.Admin, gameVersion.gameName);
            if (!session) {
                return;
            }

            let previousDefault = await GameVersion.getDefaultVersionObject(gameVersion.gameName);

            previousDefault.defaultVersion = false;
            await previousDefault.save();
            gameVersion.defaultVersion = true;
            await gameVersion.save();
            DatabaseHelper.refreshCache(`gameVersions`);
            return res.status(200).send({ message: `Default version set`, gameVersion, previousDefault });
        });
    }
}