import { Express } from 'express';
import { DatabaseHelper, UserRoles, Visibility } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Logger } from '../../shared/Logger';

export class ApprovalRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/approval/new`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Approver);

            let newMods = await DatabaseHelper.database.Mods.findAll({ where: { visibility: `unverified` } });
            let newModVersions = await DatabaseHelper.database.ModVersions.findAll({ where: { visibility: `unverified` } });

            res.status(200).send({ mods: newMods, modVersions: newModVersions });
        });

        this.app.get(`/api/approval/edits`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Approver);

            let editQueue = await DatabaseHelper.database.EditApprovalQueue.findAll({where: { approved: false }});

            res.status(200).send({ edits: editQueue });
        });

        // #region New Approvals
        this.app.post(`/api/approval/mod/:modIdParam`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Approver);
            let modId = parseInt(req.params.modIdParam, 10);
            let status = req.body.status;

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

            mod.update({ visibility: status }).then(() => {
                Logger.log(`Mod ${modId} set to status ${status} by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod ${status}.` });
            }).catch((error) => {
                Logger.error(`Error ${status} mod: ${error}`);
                return res.status(500).send({ message: `Error ${status} mod:  ${error}` });
            });
        });

        this.app.post(`/api/modversion/:modVersionIdParam/approval`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Approver);
            let modVersionId = parseInt(req.params.modVersionIdParam, 10);
            let status = req.body.status;

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

            mod.update({ visibility: status }).then(() => {
                Logger.log(`Mod ${modVersion.id} set to status ${status} by ${session.user.username}.`);
                return res.status(200).send({ message: `Mod ${status}.` });
            }).catch((error) => {
                Logger.error(`Error ${status} mod: ${error}`);
                return res.status(500).send({ message: `Error ${status} mod:  ${error}` });
            });
        });
        // #endregion

        //#region Edit Approvals
        this.app.post(`/api/approval/edit/:editIdParam`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Approver);
            let editId = parseInt(req.params.editIdParam, 10);
            let status = req.body.status;

            if (!status || !DatabaseHelper.isValidVisibility(status)) {
                return res.status(400).send({ message: `Missing status.` });
            }

            if (!editId || isNaN(editId)) {
                return res.status(400).send({ message: `Invalid edit id.` });
            }

            let edit = await DatabaseHelper.database.EditApprovalQueue.findOne({ where: { id: editId } });
            if (!edit) {
                return res.status(404).send({ message: `Edit not found.` });
            }

            let isMod = `name` in edit.obj;
            let modId = isMod ? edit.objId : await DatabaseHelper.database.ModVersions.findOne({ where: { id: edit.objId } }).then((modVersion) => modVersion.modId);

            if (!modId) {
                return res.status(404).send({ message: `Mod not found.` });
            }
            
            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (mod.authorIds.includes(session.user.id)) {
                return res.status(401).send({ message: `You cannot approve your own mod.` });
            }

            if (status === Visibility.Verified) {
                edit.approve(session.user).then(() => {
                    Logger.log(`Edit ${editId} set to status ${status} by ${session.user.username}.`);
                    return res.status(200).send({ message: `Edit ${status}.` });
                }).catch((error) => {
                    Logger.error(`Error ${status} edit: ${error}`);
                    return res.status(500).send({ message: `Error ${status} edit:  ${error}` });
                });
            } else if (status === Visibility.Unverified) {
                edit.destroy().then(() => {
                    Logger.log(`Edit ${editId} set to status ${status} by ${session.user.username}.`);
                    return res.status(200).send({ message: `Edit ${status}.` });
                }).catch((error) => {
                    Logger.error(`Error ${status} edit: ${error}`);
                    return res.status(500).send({ message: `Error ${status} edit:  ${error}` });
                });
            }
        // #endregion
        });
    }
}