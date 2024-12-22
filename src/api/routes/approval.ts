import { Express } from 'express';
import { DatabaseHelper, UserRoles, Status, ModVersionApproval } from '../../shared/Database';
import { validateAdditionalGamePermissions, validateSession } from '../../shared/AuthHelper';
import { Logger } from '../../shared/Logger';
import { coerce, valid } from 'semver';
import { HTTPTools } from '../../shared/HTTPTools';

export class ApprovalRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/approval/new`, async (req, res) => {
            // #swagger.tags = ['Approval']
            let gameName = req.query.gameName;
            if (typeof gameName !== `string` || !DatabaseHelper.isValidGameName(gameName)) {
                return res.status(400).send({ message: `Missing game name.` });
            }
            let session = await validateSession(req, res, UserRoles.Approver, gameName);
            if (!session.approved) {
                return;
            }

            let newMods = (await DatabaseHelper.database.Mods.findAll({ where: { status: `unverified`, gameName: gameName } })).map((mod) => mod.toAPIResponse());
            let newModVersions = await DatabaseHelper.database.ModVersions.findAll({ where: { status: `unverified` } });
            if (!newMods || !newModVersions) {
                return res.status(404).send({ message: `No mods found.` });
            }

            let modVersions = newModVersions.filter((modVersion) => {
                for (let gameVersionId of modVersion.supportedGameVersionIds) {
                    let gV = DatabaseHelper.cache.gameVersions.find((gameVersion) => gameVersion.id === gameVersionId);
                    if (!gV || gV.gameName !== gameName) {
                        return false;
                    } else {
                        return true;
                    }
                }
            });

            res.status(200).send({ mods: newMods, modVersions: modVersions });
        });

        this.app.get(`/api/approval/edits`, async (req, res) => {
            // #swagger.tags = ['Approval']
            let gameName = req.query.gameName;
            if (typeof gameName !== `string` || !DatabaseHelper.isValidGameName(gameName)) {
                return res.status(400).send({ message: `Missing game name.` });
            }
            let session = await validateSession(req, res, UserRoles.Approver, gameName);
            if (!session.approved) {
                return;
            }

            let editQueue = await DatabaseHelper.database.EditApprovalQueue.findAll({where: { approved: null }});
            if (!editQueue) {
                return res.status(404).send({ message: `No edits found.` });
            }

            editQueue = editQueue.filter((edit) => {
                if (`name` in edit.object) {
                    return edit.object.gameName === gameName;
                } else {
                    return edit.object.supportedGameVersionIds.filter((gameVersionId) => {
                        let gV = DatabaseHelper.cache.gameVersions.find((gameVersion) => gameVersion.id === gameVersionId);
                        if (!gV) {
                            return false;
                        }
                        return gV.gameName === gameName;
                    }).length > 0;
                }
            });

            res.status(200).send({ edits: editQueue });
        });

        // #region Accept/Reject Approvals
        this.app.post(`/api/approval/mod/:modIdParam/approve`, async (req, res) => {
            // #swagger.tags = ['Approval']
            let modId = parseInt(req.params.modIdParam, 10);
            let status = req.body.status;
            let session = await validateSession(req, res, UserRoles.Approver, DatabaseHelper.getGameNameFromModId(modId));
            if (!session.approved) {
                return;
            }

            if (!status || !DatabaseHelper.isValidVisibility(status)) {
                return res.status(400).send({ message: `Missing status.` });
            }

            if (!modId || isNaN(modId)) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (mod.authorIds.includes(session.user.id)) {
                return res.status(401).send({ message: `You cannot approve your own mod.` });
            }

            mod.setStatus(status, session.user).then(() => {
                Logger.log(`Mod ${modId} set to status ${status} by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod ${status}.` });
            }).catch((error) => {
                Logger.error(`Error ${status} mod: ${error}`);
                return res.status(500).send({ message: `Error ${status} mod:  ${error}` });
            });
        });

        this.app.post(`/api/approval/modversion/:modVersionIdParam/approve`, async (req, res) => {
            // #swagger.tags = ['Approval']
            let modVersionId = parseInt(req.params.modVersionIdParam, 10);
            let status = req.body.status;
            let session = await validateSession(req, res, UserRoles.Approver, DatabaseHelper.getGameNameFromModVersionId(modVersionId));
            if (!session.approved) {
                return;
            }

            if (!status || !DatabaseHelper.isValidVisibility(status)) {
                return res.status(400).send({ message: `Missing status.` });
            }

            if (!modVersionId || isNaN(modVersionId)) {
                return res.status(400).send({ message: `Invalid mod version id.` });
            }

            let modVersion = await DatabaseHelper.database.ModVersions.findOne({ where: { id: modVersionId } });
            if (!modVersion) {
                return res.status(404).send({ message: `Mod version not found.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modVersion.modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (mod.authorIds.includes(session.user.id)) {
                return res.status(401).send({ message: `You cannot approve your own mod.` });
            }

            modVersion.setStatus(status, session.user).then(() => {
                Logger.log(`ModVersion ${modVersion.id} set to status ${status} by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod ${status}.` });
            }).catch((error) => {
                Logger.error(`Error ${status} mod: ${error}`);
                return res.status(500).send({ message: `Error ${status} mod:  ${error}` });
            });
        });

        this.app.post(`/api/approval/edit/:editIdParam/approve`, async (req, res) => {
            // #swagger.tags = ['Approval']
            let editId = parseInt(req.params.editIdParam, 10);
            let accepted = req.body.accepted;
            let session = await validateSession(req, res, UserRoles.Approver, DatabaseHelper.getGameNameFromEditApprovalQueueId(editId));
            if (!session.approved) {
                return;
            }

            if (accepted === null || accepted === undefined || typeof accepted !== `boolean`) {
                return res.status(400).send({ message: `Missing status.` });
            }

            if (!editId || isNaN(editId)) {
                return res.status(400).send({ message: `Invalid edit id.` });
            }

            let edit = await DatabaseHelper.database.EditApprovalQueue.findOne({ where: { id: editId } });
            if (!edit) {
                return res.status(404).send({ message: `Edit not found.` });
            }

            let isMod = `name` in edit.object;
            let modId = isMod ? edit.objectId : await DatabaseHelper.database.ModVersions.findOne({ where: { id: edit.objectId } }).then((modVersion) => modVersion.modId);

            if (!modId) {
                return res.status(404).send({ message: `Mod not found.` });
            }
            
            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (accepted) {
                edit.approve(session.user).then((record) => {
                    Logger.log(`Edit ${editId} accepted by ${session.user.username}.`);
                    return res.status(200).send({ message: `Edit accepted.`, record: record });
                }).catch((error) => {
                    Logger.error(`Error approving edit ${editId}: ${error}`);
                    return res.status(500).send({ message: `Error approving edit:  ${error}` });
                });
            } else {
                edit.deny(session.user).then(() => {
                    Logger.log(`Edit ${editId} rejected by ${session.user.username}.`);
                    return res.status(200).send({ message: `Edit rejected.` });
                }).catch((error) => {
                    Logger.error(`Error rejecting edit ${editId}: ${error}`);
                    return res.status(500).send({ message: `Error rejecting edit:  ${error}` });
                });
            }
        });
        // #endregion

        // #region Edit Approvals
        this.app.patch(`/api/approval/mod/:modIdParam`, async (req, res) => {
            // #swagger.tags = ['Approval']
            //return res.status(501).send({ message: `Not implemented.` });
            let modId = parseInt(req.params.modIdParam, 10);
            let name = req.body.name;
            let summary = req.body.summary;
            let description = req.body.description;
            let gitUrl = req.body.gitUrl;
            let category = req.body.category;
            let gameName = req.body.gameName;
            let session = await validateSession(req, res, UserRoles.Approver, DatabaseHelper.getGameNameFromModId(modId));
            if (!session.approved) {
                return;
            }

            if (validateAdditionalGamePermissions(session, gameName, UserRoles.Approver) == false) {
                return res.status(401).send({ message: `You cannot edit this mod.` });
            }

            if (!name && !summary && !description && !gitUrl && !category && !gameName) {
                return res.status(400).send({ message: `No changes provided.` });
            }

            if (name && HTTPTools.validateStringParameter(name, 3) == false) {
                return res.status(400).send({ message: `Invalid name.` });
            }

            if (description && HTTPTools.validateStringParameter(description, 3) == false) {
                return res.status(400).send({ message: `Invalid description.` });
            }

            if (summary && HTTPTools.validateStringParameter(summary, 3) == false) {
                return res.status(400).send({ message: `Invalid summary.` });
            }

            if (gitUrl && HTTPTools.validateStringParameter(gitUrl, 5) == false) {
                return res.status(400).send({ message: `Invalid gitUrl.` });
            }

            if (category && HTTPTools.validateStringParameter(category) && DatabaseHelper.isValidCategory(category)) {
                return res.status(400).send({ message: `Invalid category.` });
            }

            if (gameName && (typeof gameName !== `string` || DatabaseHelper.isValidGameName(gameName) == false)) {
                return res.status(400).send({ message: `Invalid gameName.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });

            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            mod.name = name || mod.name;
            mod.summary = summary || mod.summary;
            mod.description = description || mod.description;
            mod.gitUrl = gitUrl || mod.gitUrl;
            mod.category = category || mod.category;
            mod.gameName = gameName || mod.gameName;
            mod.lastUpdatedById = session.user.id;
            mod.save().then(() => {
                Logger.log(`Mod ${modId} updated by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod updated.`, mod: mod });
            }).catch((error) => {
                Logger.error(`Error updating mod ${modId}: ${error}`);
                return res.status(500).send({ message: `Error updating mod: ${error}` });
            });
        });

        this.app.patch(`/api/approval/modversion/:modVersionIdParam`, async (req, res) => {
            //return res.status(501).send({ message: `Not implemented.` });
            // #swagger.tags = ['Approval']
            let modVersionId = parseInt(req.params.modVersionIdParam, 10);
            let gameVersionIds = req.body.gameVersionIds;
            let modVersion = req.body.modVersion;
            let dependencyIds = req.body.dependencyIds;
            let platform = req.body.platform;
            let session = await validateSession(req, res, UserRoles.Approver, DatabaseHelper.getGameNameFromModVersionId(modVersionId));
            if (!session.approved) {
                return;
            }

            let modVer = await DatabaseHelper.database.ModVersions.findOne({ where: { id: modVersionId, status: Status.Unverified } });
            if (!modVer) {
                return res.status(404).send({ message: `Mod version not found.` });
            }

            if (!modVersion && !gameVersionIds && !dependencyIds && !platform) {
                return res.status(400).send({ message: `No changes provided.` });
            }

            if (modVersion && HTTPTools.validateStringParameter(modVersion, 3) == false && valid(modVersion) == null) {
                return res.status(400).send({ message: `Invalid mod version.` });
            }

            if (platform && HTTPTools.validateStringParameter(platform, 3) == false && DatabaseHelper.isValidPlatform(platform) == false) {
                return res.status(400).send({ message: `Invalid platform.` });
            }

            if (dependencyIds && HTTPTools.validateNumberArrayParameter(dependencyIds) == false) {
                return res.status(400).send({ message: `Invalid dependency ids.` });
            }

            if (gameVersionIds && HTTPTools.validateNumberArrayParameter(gameVersionIds)) {
                let versionsToPush = [];
                for (let gVId of gameVersionIds) {
                    if (typeof gVId !== `number`) {
                        return res.status(400).send({ message: `Invalid game version id. (Reading ${gVId})` });
                    }
                    let gameVersionDB = await DatabaseHelper.database.GameVersions.findOne({ where: { id: gVId } });
                    if (!gameVersionDB) {
                        return res.status(404).send({ message: `Game version (${gVId}) not found.` });
                    }
                    versionsToPush.push(gameVersionDB.id);
                }
                modVer.supportedGameVersionIds = versionsToPush;
            } else if (gameVersionIds) {
                return res.status(400).send({ message: `Invalid gameVersionIds.` });
            }

            if (dependencyIds && HTTPTools.validateNumberArrayParameter(dependencyIds)) {
                let dependenciesToPush = [];
                for (let dependencyId of dependencyIds) {
                    if (typeof dependencyId !== `number`) {
                        return res.status(400).send({ message: `Invalid dependency id. (Reading ${dependencyId})` });
                    }
                    let dependencyMod = await DatabaseHelper.database.ModVersions.findOne({ where: { id: dependencyId } });
                    if (!dependencyMod) {
                        return res.status(404).send({ message: `Dependency mod (${dependencyId}) not found.` });
                    }
                    dependenciesToPush.push(dependencyMod.id);
                }
                modVer.dependencies = dependenciesToPush;
            } else if (dependencyIds) {
                return res.status(400).send({ message: `Invalid dependencyIds.` });
            }

            modVer.modVersion = modVersion || modVer.modVersion;
            modVer.platform = platform || modVer.platform;
            modVer.lastUpdatedById = session.user.id;
            modVer.save().then(() => {
                Logger.log(`ModVersion ${modVersionId} updated by ${session.user.username}.`);
                return res.status(200).send({ message: `ModVersion updated.`, modVersion: modVer });
            }).catch((error) => {
                Logger.error(`Error updating modVersion ${modVersionId}: ${error}`);
                return res.status(500).send({ message: `Error updating modVersion: ${error}` });
            });
        });

        this.app.patch(`/api/approval/edit/:editIdParam`, async (req, res) => {
            //return res.status(501).send({ message: `Not implemented.` });
            // #swagger.tags = ['Approval']
            let editId = parseInt(req.params.editIdParam, 10);
            let session = await validateSession(req, res, UserRoles.Approver, DatabaseHelper.getGameNameFromEditApprovalQueueId(editId));
            if (!session.approved) {
                return;
            }
            
            let edit = await DatabaseHelper.database.EditApprovalQueue.findOne({ where: { id: editId, approved: null } });

            if (!edit) {
                return res.status(404).send({ message: `Edit not found.` });
            }

            let modId = edit.isMod() ? edit.objectId : await DatabaseHelper.database.ModVersions.findOne({ where: { id: edit.objectId } }).then((modVersion) => modVersion.modId);
            
            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });

            if (!mod) {
                return res.status(500).send({ message: `Mod not found.` });
            }

            if (mod.authorIds.includes(session.user.id)) {
                Logger.warn(`User ${session.user.username} edited their own mod (${mod.name}).`);
            }

            switch (edit.objectTableName) {
                case `mods`:
                    if (!edit.isMod()) {
                        Logger.error(`Edit ${editId} is not a mod edit, despite the table name being "mods".`);
                        return res.status(500).send({ message: `Invalid edit.` });
                    }

                    let name = req.body.name;
                    let description = req.body.description;
                    let summary = req.body.summary;
                    let gitUrl = req.body.gitUrl;
                    let category = req.body.category;
                    let authorIds = req.body.authorIds;
                    let gameName = req.body.gameName;
                    
                    // set limits
                    if (name && HTTPTools.validateStringParameter(name, 3) == false) {
                        return res.status(400).send({ message: `Invalid name.` });
                    }

                    if (summary && HTTPTools.validateStringParameter(summary, 3) == false) {
                        return res.status(400).send({ message: `Invalid summary.` });
                    }

                    if (description && HTTPTools.validateStringParameter(description, 3) == false) {
                        return res.status(400).send({ message: `Invalid description.` });
                    }

                    if (gitUrl && HTTPTools.validateStringParameter(gitUrl, 5) == false) {
                        return res.status(400).send({ message: `Invalid gitUrl.` });
                    }

                    if (category && HTTPTools.validateStringParameter(category) && DatabaseHelper.isValidCategory(category)) {
                        return res.status(400).send({ message: `Invalid category.` });
                    }

                    if (gameName && (typeof gameName !== `string` || DatabaseHelper.isValidGameName(gameName) == false)) {
                        return res.status(400).send({ message: `Invalid gameName.` });
                    }

                    if (authorIds && HTTPTools.validateNumberArrayParameter(authorIds)) {
                        for (let authorId of authorIds) {
                            if (typeof authorId !== `number`) {
                                return res.status(400).send({ message: `Invalid author id. (Reading ${authorId})` });
                            }
                            let author = await DatabaseHelper.database.Users.findOne({ where: { id: authorId } });
                            if (!author) {
                                return res.status(404).send({ message: `Author (${authorId}) not found.` });
                            }
                        }
                    } else if (authorIds) {
                        return res.status(400).send({ message: `Invalid authorIds.` });
                    }

                    edit.object = {
                        name: name || edit.object.name,
                        summary: summary || edit.object.summary,
                        description: description || edit.object.description,
                        gitUrl: gitUrl || edit.object.gitUrl,
                        category: category || edit.object.category,
                        authorIds: authorIds || edit.object.authorIds,
                        gameName: gameName || edit.object.gameName,
                    };
                    edit.save();
                    break;
                case `modVersions`:
                    if (!edit.isModVersion()) {
                        Logger.error(`Edit ${editId} is not a mod version edit, despite the table name being "modVersions".`);
                        return res.status(500).send({ message: `Invalid edit.` });
                    }
                    
                    let gameVersions = req.body.gameVersions;
                    let modVersion = req.body.modVersion;
                    let dependencies = req.body.dependencies;
                    let platform = req.body.platform;

                    let modVerObj = Object.create(edit.object, edit.object) as ModVersionApproval;

                    if (dependencies && Array.isArray(dependencies)) {
                        for (let dependancy of dependencies) {
                            if (typeof dependancy !== `number`) {
                                return res.status(400).send({ message: `Invalid dependancy. (Reading ${dependancy})` });
                            }
                            let dependancyMod = await DatabaseHelper.database.Mods.findOne({ where: { id: dependancy } });
                            if (!dependancyMod) {
                                return res.status(404).send({ message: `Dependancy mod (${dependancy}) not found.` });
                            }
                        }
                        modVerObj.dependencies = dependencies;
                    }

                    if (gameVersions && Array.isArray(gameVersions)) {
                        let versionsToPush = [];
                        for (let version of gameVersions) {
                            if (typeof version !== `number`) {
                                return res.status(400).send({ message: `Invalid game version. (Reading ${version})` });
                            }
                            let gameVersionDB = await DatabaseHelper.database.Mods.findOne({ where: { id: version } });
                            if (!gameVersionDB) {
                                return res.status(404).send({ message: `Game version (${version}) not found.` });
                            }
                            versionsToPush.push(gameVersionDB.id);
                        }
                        modVerObj.supportedGameVersionIds = versionsToPush;
                    }

                    if (modVersion && typeof modVersion === `string`) {
                        modVerObj.modVersion = coerce(modVersion, { includePrerelease: true });
                    }

                    if (platform && DatabaseHelper.isValidPlatform(platform)) {
                        modVerObj.platform = platform;
                    }

                    edit.object = modVerObj;
                    edit.save();
                    break;
            }

            res.status(200).send({ message: `Edit updated.`, edit: edit });
        });
    }
}