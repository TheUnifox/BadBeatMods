import { Express } from 'express';
import { DatabaseHelper, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Config } from '../../shared/Config';
import * as fs from 'fs';
import * as path from 'path';
import { Validator } from '../../shared/Validator';

export class AdminRoutes {
    private app: Express;
    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/admin/health/hashCheck`, async (req, res) => {
            // #swagger.tags = ['Admin']
            let session = await validateSession(req, res, UserRoles.Admin);
            if (!session.approved) {
                return;
            }

            let versions = await DatabaseHelper.database.ModVersions.findAll();
            let errors = [];

            let allZips = fs.readdirSync(path.resolve(Config.storage.modsDir), { withFileTypes: true }).filter(dirent => dirent.isFile() && dirent.name.endsWith(`.zip`));

            for (let version of versions) {
                if (!allZips.find(zip => zip.name === `${version.zipHash}.zip`)) {
                    errors.push(version.zipHash);
                }
            }

            if (errors.length > 0) {
                return res.status(500).send({ message: `Unable to resolve ${errors.length} hashes.`, errors });
            }

            return res.status(200).send({ message: `All hashes are valid.` });
        });

        this.app.get(`/api/admin/health/missingIcons`, async (req, res) => {
            // #swagger.tags = ['Admin']
            let session = await validateSession(req, res, UserRoles.Admin);
            if (!session.approved) {
                return;
            }

            let mods = await DatabaseHelper.database.Mods.findAll();
            let errors = [];

            let allIcons = fs.readdirSync(path.resolve(Config.storage.iconsDir), { withFileTypes: true }).filter(dirent => dirent.isFile()).map(dirent => dirent.name);

            for (let mod of mods) {
                if (!allIcons.find(icon => icon === mod.iconFileName)) {
                    errors.push(mod.iconFileName);
                }
            }

            if (errors.length > 0) {
                return res.status(500).send({ message: `Unable to resolve ${errors.length} icons.`, errors });
            }

            return res.status(200).send({ message: `All icons are valid.` });
        });

        this.app.get(`/api/admin/health/dependencyResolution`, async (req, res) => {
            // #swagger.tags = ['Admin']
            let session = await validateSession(req, res, UserRoles.Admin);
            if (!session.approved) {
                return;
            }

            let request = await fetch(`${Config.server.url}/api/mods`);
            let mods = await request.json() as any;
            let errors = [];
            for (let mod of mods.mods) {
                for (let dependancy of mod.latest.dependencies) {
                    if (!mods.mods.find((m: any) => m.latest.id === dependancy)) {
                        errors.push({ mod: mod.mod.name, versionId: mod.latest.id, dependency: dependancy });
                    }
                }
            }

            if (errors.length > 0) {
                let missingIds = Array.from(new Set(errors.map((error: any) => error.dependency)));
                return res.status(500).send({ message: `Unable to resolve ${errors.length} dependencies.`, missingIds, errors });
            }

            return res.status(200).send({ message: `All dependencies are valid.` });
        });

        this.app.post(`/api/admin/linkversions`, async (req, res) => {
            // #swagger.tags = ['Admin']
            // #swagger.summary = 'Mark all versions as compatible with another gameversion.'
            // #swagger.description = 'Link two versions together.'
            /* #swagger.parameters['body'] = {
                in: 'body',
                description: 'The versions to link.',
                required: true,
                schema: {
                    version1: 1,
                    version2: 2
                }
            } */
            let session = await validateSession(req, res, UserRoles.Admin);
            if (!session.approved) {
                return;
            }
            
            let versionId1 = Validator.zDBID.safeParse(req.body.version1);
            let versionId2 = Validator.zDBID.safeParse(req.body.version2);

            if (!versionId1.success || !versionId2.success) {
                return res.status(400).send({ message: `Missing version.` });
            }

            const modVersions = await DatabaseHelper.database.ModVersions.findAll();
            const version1 = await DatabaseHelper.database.GameVersions.findByPk(versionId1.data);
            const version2 = await DatabaseHelper.database.GameVersions.findByPk(versionId1.data);
            if (!version1 || !version2) {
                return res.status(404).send({ message: `Versions not found.` });
            }

            for (let modVersion of modVersions) {
                if (modVersion.supportedGameVersionIds.includes(version1.id) && !modVersion.supportedGameVersionIds.includes(version2.id)) {
                    modVersion.supportedGameVersionIds = [...modVersion.supportedGameVersionIds, version2.id];
                }

                if (modVersion.supportedGameVersionIds.includes(version2.id) && !modVersion.supportedGameVersionIds.includes(version1.id)) {
                    modVersion.supportedGameVersionIds = [...modVersion.supportedGameVersionIds, version1.id];
                }
                modVersion.save();
            }

            return res.status(200).send({ message: `Version ${version1.gameName} ${version1.version} & ${version2.gameName} ${version2.version} have been linked.` });
        });
    }
}