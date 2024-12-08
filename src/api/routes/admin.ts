import { Express } from 'express';
import { DatabaseHelper, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Logger } from '../../shared/Logger';
import { Config } from '../../shared/Config';
import * as fs from 'fs';
import * as path from 'path';

export class AdminRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.post(`/api/admin/addversion`, async (req, res) => {
            // #swagger.tags = ['Admin']
            let session = await validateSession(req, res, UserRoles.Admin);
            if (!session.approved) {
                return;
            }
            let version = req.body.version;

            if (!version) {
                return res.status(400).send({ message: `Missing version.` });
            }

            let versions = await DatabaseHelper.database.GameVersions.findAll({ where: { version: version } });
            if (versions.length > 0) {
                return res.status(409).send({ message: `Version already exists.` });
            }

            DatabaseHelper.database.GameVersions.create({
                version: version
            }).then((version) => {
                Logger.log(`Version ${version} added by ${session.user.username}.`);
                return res.status(200).send({ version });
            }).catch((error) => {
                Logger.error(`Error creating version: ${error}`);
                return res.status(500).send({ message: `Error creating version: ${error}` });
            });
        });

        this.app.get(`/api/admin/hashCheck`, async (req, res) => {
            // #swagger.tags = ['Admin']
            let session = await validateSession(req, res, UserRoles.Admin);
            if (!session.approved) {
                return;
            }

            let versions = await DatabaseHelper.database.ModVersions.findAll();
            let errors = [];

            let allZips = fs.readdirSync(path.resolve(`../../../`, Config.storage.modsDir), { withFileTypes: true }).filter(dirent => dirent.isFile() && dirent.name.endsWith(`.zip`));

            for (let version of versions) {
                if (!allZips.find(zip => zip.name === version.zipHash)) {
                    errors.push(version.zipHash);
                }
            }

            if (errors.length > 0) {
                return res.status(500).send({ message: `Unable to resolve ${errors.length} hashes.`, errors });
            }

            return res.status(200).send({ message: `All hashes are valid.` });
        });

        this.app.post(`/api/admin/linkversions`, async (req, res) => {
            // #swagger.tags = ['Admin']
            let session = await validateSession(req, res, UserRoles.Admin);
            if (!session.approved) {
                return;
            }
            

            let versions = await DatabaseHelper.database.ModVersions.findAll();
            let errors = [];

            for (let version of versions) {
                let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: version.modId } });
                if (!mod) {
                    errors.push(version.modId);
                    continue;
                }

                let gameVersion = await DatabaseHelper.database.GameVersions.findOne({ where: { version: version.gameVersion } });
                if (!gameVersion) {
                    errors.push(version.gameVersion);
                    continue;
                }

                version.gameVersionId = gameVersion.id;
                version.save();
            }

            if (errors.length > 0) {
                return res.status(500).send({ message: `Unable to resolve ${errors.length} versions.`, errors });
            }

            return res.status(200).send({ message: `All versions are valid.` });
        });
    }
}