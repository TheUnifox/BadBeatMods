import { Express } from 'express';
import { DatabaseHelper, Status, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Logger } from '../../shared/Logger';
import { SemVer } from 'semver';
import { HTTPTools } from '../../shared/HTTPTools';

export class UpdateModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.patch(`/api/mods/:modIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            let modId = parseInt(req.params.modIdParam, 10);
            let name = req.body.name;
            let description = req.body.description;
            let category = req.body.category;
            let authorIds = req.body.authorIds;
            let gitUrl = req.body.gitUrl;
            let gameName = req.body.gameName;
            if (gameName && (typeof gameName !== `string` || DatabaseHelper.isValidGameName(gameName) == false)) {
                return res.status(400).send({ message: `Invalid gameName.` });
            }
            let session = await validateSession(req, res, true, gameName ?? DatabaseHelper.getGameNameFromModId(modId));
            if (!session.approved) {
                return;
            }

            if (!modId || isNaN(modId)) {
                return res.status(400).send({ message: `Missing valid modId.` });
            }

            if (!name && !description && !category && !authorIds && !gitUrl) {
                return res.status(400).send({ message: `No changes provided.` });
            }

            if (authorIds && HTTPTools.validateNumberArrayParameter(authorIds) == false) {
                return res.status(400).send({ message: `Invalid authorIds.` });
            }

            if (category && HTTPTools.validateStringParameter(category) == false) {
                return res.status(400).send({ message: `Invalid category.` });
            }

            if (gitUrl && HTTPTools.validateStringParameter(gitUrl) == false) {
                return res.status(400).send({ message: `Invalid gitUrl.` });
            }

            if (name && HTTPTools.validateStringParameter(name) == false) {
                return res.status(400).send({ message: `Invalid name.` });
            }

            if (description && HTTPTools.validateStringParameter(description) == false) {
                return res.status(400).send({ message: `Invalid description.` });
            }

            if (gameName && HTTPTools.validateStringParameter(gameName) == false && DatabaseHelper.isValidGameName(gameName) == false) {
                return res.status(400).send({ message: `Invalid gameName.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            // TODO: check per game permissions
            let allowedToEdit = false;
            if (session.user.roles.sitewide.includes(UserRoles.Admin) || session.user.roles.sitewide.includes(UserRoles.Approver) || mod.authorIds.includes(session.user.id)
            ) {
                allowedToEdit = true;
            }

            if (gameName && !allowedToEdit && DatabaseHelper.isValidGameName(gameName)) {
                session.user.roles.perGame[gameName]?.includes(UserRoles.Admin) || session.user.roles.perGame[gameName]?.includes(UserRoles.Approver) ? allowedToEdit = true : null;
            }

            if (!allowedToEdit) {
                return res.status(401).send({ message: `You cannot edit this mod.` });
            }

            if (mod.status == Status.Private) {
                let existingEdit = await DatabaseHelper.database.EditApprovalQueue.findOne({ where: { objectId: mod.id, objectTableName: `mods`, submitterId: session.user.id } });

                if (existingEdit) {
                    return res.status(400).send({ message: `You already have a pending edit for this mod.` }); // todo: allow updating the edit
                }

                await DatabaseHelper.database.EditApprovalQueue.create({
                    submitterId: session.user.id,
                    objectTableName: `mods`,
                    objectId: mod.id,
                    object: {
                        name: name || mod.name,
                        description: description || mod.description,
                        gameName: gameName || mod.gameName,
                        gitUrl: gitUrl || mod.gitUrl,
                        authorIds: authorIds || mod.authorIds,
                        category: category || mod.category,
                    }
                }).then((edit) => {
                    res.status(200).send({ message: `Edit submitted for approval.`, edit: edit });
                }).catch((error) => {
                    Logger.error(`Error submitting edit: ${error}`);
                    res.status(500).send({ message: `Error submitting edit.` });
                });
            } else {
                res.status(501).send({ message: `Not implemented.` });
            }
        });

        this.app.patch(`/api/modversion/:modVersionIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            return res.status(501).send({ message: `Not implemented.` });
        });
            

    }
}