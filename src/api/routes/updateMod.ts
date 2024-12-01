import { Express } from 'express';
import { DatabaseHelper, ModVersionVisibility, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Logger } from '../../shared/Logger';

export class UpdateModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.post(`/api/mod/:modIdParam/approve`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Approver);
            let modId = parseInt(req.params.modIdParam);
            if (!modId) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (mod.authorIds.includes(session.user.id)) {
                return res.status(401).send({ message: `You cannot approve your own mod.` });
            }
            
            mod.update({ visibility: ModVersionVisibility.Verified }).then(() => {
                Logger.log(`Mod ${modId} approved by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod approved.` });
            }).catch((error) => {
                Logger.error(`Error approving mod: ${error}`);
                return res.status(500).send({ message: `Error approving mod:  ${error}` });
            });
        });

        this.app.post(`/api/modversion/:modVersionIdParam/approve`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Approver);
            let modVersionId = parseInt(req.params.modVersionIdParam);
            if (!modVersionId) {
                return res.status(400).send({ message: `Invalid mod version id.` });
            }

            let modVersion = await DatabaseHelper.database.ModVersions.findOne({ where: { id: modVersionId } });
            if (!modVersion) {
                return res.status(404).send({ message: `Mod version not found.` });
            }

            if (modVersion.authorId === session.user.id) {
                return res.status(401).send({ message: `You cannot approve your own mod.` });
            }

            modVersion.update({ visibility: ModVersionVisibility.Verified }).then(() => {
                Logger.log(`Mod version ${modVersionId} approved by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod version approved.` });
            }).catch((error) => {
                Logger.error(`Error approving mod version: ${error}`);
                return res.status(500).send({ message: `Error approving mod version: ${error}` });
            });
        });
    }
}