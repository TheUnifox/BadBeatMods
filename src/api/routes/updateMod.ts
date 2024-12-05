import { Express } from 'express';
import { DatabaseHelper, Visibility, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Logger } from '../../shared/Logger';
import { SemVer } from 'semver';

export class UpdateModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.patch(`/api/mod/:modIdParam`, async (req, res) => {
            return res.status(501).send({ message: `Not implemented.` });
            let session = await validateSession(req, res, true);
            let modId = parseInt(req.params.modIdParam, 10);
            let name = req.body.name;
            let description = req.body.description;
            let gitUrl = req.body.gitUrl;
            
            if (!modId || isNaN(modId)) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (session.user.roles.includes(UserRoles.Admin) || session.user.roles.includes(UserRoles.Moderator) || !mod.authorIds.includes(session.user.id)) {
                // Admins and moderators can edit any mod, authors can edit their own mods
            } else {
                return res.status(401).send({ message: `You cannot edit this mod.` });
            }

            if (name && typeof name === `string` && name.length > 0) {
                mod.name = name;
                mod.visibility = Visibility.Unverified;
            }

            if (description && typeof description === `string` && description.length > 0) {
                mod.description = description;
                mod.visibility = Visibility.Unverified;
            }

            if (gitUrl && typeof gitUrl === `string` && gitUrl.length > 0) {
                mod.gitUrl = gitUrl;
                mod.visibility = Visibility.Unverified;
            }

            mod.save().then(() => {
                Logger.log(`Mod ${modId} updated by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod updated.` });
            }).catch((error) => {
                Logger.error(`Error updating mod: ${error}`);
                return res.status(500).send({ message: `Error updating mod: ${error}` });
            });
        });

        this.app.patch(`/api/modversion/:modVersionIdParam`, async (req, res) => {
            return res.status(501).send({ message: `Not implemented.` });
            let session = await validateSession(req, res, true);
            let modVersionId = parseInt(req.params.modVersionIdParam, 10);
            let gameVersions = req.body.gameVersions;
            let modSemVerVersion = req.body.modVersion;
            let dependencies = req.body.dependencies;
            let platform = req.body.platform;

            if (!modVersionId || isNaN(modVersionId)) {
                return res.status(400).send({ message: `Missing valid modVersionId or modVersion.` });
            }

            let modVersion = await DatabaseHelper.database.ModVersions.findOne({ where: { id: modVersionId } });
            if (!modVersion) {
                return res.status(404).send({ message: `Mod version not found.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modVersion.modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (session.user.roles.includes(UserRoles.Admin) || session.user.roles.includes(UserRoles.Moderator) || !mod.authorIds.includes(session.user.id)) {
                // Admins and moderators can edit any mod, authors can edit their own mods
            } else {
                return res.status(401).send({ message: `You cannot edit this mod.` });
            }

            if (dependencies && Array.isArray(dependencies)) {
                for (let dependancy of dependencies) {
                    if (typeof dependancy !== `number`) {
                        return res.status(400).send({ message: `Invalid dependancy id. (Reading ${dependancy})` });
                    }
                    let dependancyMod = await DatabaseHelper.database.Mods.findOne({ where: { id: dependancy } });
                    if (!dependancyMod) {
                        return res.status(404).send({ message: `Dependancy mod (${dependancy}) not found.` });
                    }
                }
                modVersion.dependencies = dependencies;
                modVersion.visibility = Visibility.Unverified;
            }

            if (gameVersions && Array.isArray(gameVersions)) {
                for (let version of gameVersions) {
                    if (typeof version !== `number`) {
                        return res.status(400).send({ message: `Invalid game version. (Reading ${version})` });
                    }
                    let gameVersionDB = await DatabaseHelper.database.GameVersions.findOne({ where: { id: version } });
                    if (!gameVersionDB) {
                        return res.status(404).send({ message: `Game version (${version}) not found.` });
                    }
                }
                modVersion.supportedGameVersionIds = gameVersions;
                modVersion.visibility = Visibility.Unverified;
            }

            if (modSemVerVersion && typeof modSemVerVersion === `string`) {
                modVersion.modVersion = new SemVer(modSemVerVersion); //fix this
                modVersion.visibility = Visibility.Unverified;
            }

            if (platform && DatabaseHelper.isValidPlatform(platform)) {
                modVersion.platform = platform;
                modVersion.visibility = Visibility.Unverified;
            }

            modVersion.save().then(() => {
                Logger.log(`Mod version ${modVersionId} updated by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod version updated.` });
            }).catch((error) => {
                Logger.error(`Error updating mod version: ${error}`);
                return res.status(500).send({ message: `Error updating mod version: ${error}` });
            });

        });

    }
}