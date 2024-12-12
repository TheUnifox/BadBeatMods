import { Express } from 'express';
import { DatabaseHelper, Visibility, UserRoles } from '../../shared/Database';
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
        this.app.patch(`/api/mod/:modIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            return res.status(501).send({ message: `Not implemented.` });
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

            if (authorIds && !Array.isArray(authorIds)) {
                return res.status(400).send({ message: `Invalid authorIds.` });
            }

            if (category && typeof category !== `string`) {
                return res.status(400).send({ message: `Invalid category.` });
            }

            if (gitUrl && typeof gitUrl !== `string`) {
                return res.status(400).send({ message: `Invalid gitUrl.` });
            }

            if (name && typeof name !== `string`) {
                return res.status(400).send({ message: `Invalid name.` });
            }

            if (description && typeof description !== `string`) {
                return res.status(400).send({ message: `Invalid description.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            // TODO: check per game permissions
            if (session.user.roles.sitewide.includes(UserRoles.Admin) || session.user.roles.sitewide.includes(UserRoles.Moderator) || mod.authorIds.includes(session.user.id)) {
                // Admins and moderators can edit any mod, authors can edit their own mods
            } else {
                return res.status(401).send({ message: `You cannot edit this mod.` });
            }

            let existingEdit = await DatabaseHelper.database.EditApprovalQueue.findOne({ where: { objId: mod.id, objTableName: `mods`, submitterId: session.user.id } });

            if (existingEdit) {
                return res.status(400).send({ message: `You already have a pending edit for this mod.` }); // todo: allow updating the edit
            }

            let edit = await DatabaseHelper.database.EditApprovalQueue.create({
                submitterId: session.user.id,
                objTableName: `mods`,
                objId: mod.id,
                obj: {
                    name: name || mod.name,
                    description: description || mod.description,
                    gameName: gameName || mod.gameName,
                    gitUrl: gitUrl || mod.gitUrl,
                    authorIds: authorIds || mod.authorIds,
                    category: category || mod.category,
                }
            });
            res.status(200).send({ message: `Edit submitted for approval.`, edit: edit });
        });

        this.app.patch(`/api/modversion/:modVersionIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            return res.status(501).send({ message: `Not implemented.` });
        });
            

    }
}