import { Router } from 'express';
import { DatabaseHelper, EditQueue, GameVersion, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Validator } from 'src/shared/Validator';
import { Op } from 'sequelize';

export class BulkActionsRoutes {
    private router: Router;
    constructor(router: Router) {
        this.router = router;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.router.post(`/ba/addGameVersion`, async (req, res) => {
            /*
            #swagger.tags = ['Bulk Actions']
            #swagger.summary = 'Add a game version to multiple mod versions'
            #swagger.description = 'Add a game version to multiple mod versions. Submits edits if the mod is already approved, otherwise queues an edit for approval. Requires the user to be an approver.'
            #swagger.requestBody = {
                schema: {
                    "gameVersionId": 1,
                    "modVersionIds": [1, 2, 3]
                }
            }
                    
            #swagger.responses[200] = {
                description: 'Success',
                schema: {
                    "editIds": [1, 2],
                    "errorIds": [3],
                    "editPreformedIds": [4]
                }
            }
            */
            let session = await validateSession(req, res, true);
            if (!session.user) {
                return;
            }

            let gameVersionId = Validator.zDBID.safeParse(req.body.gameVersionId);
            if (!gameVersionId.success) {
                res.status(400).send({ message: `Invalid game version ID`});
                return;
            }

            let gameVersion = await DatabaseHelper.database.GameVersions.findByPk(gameVersionId.data);
            if (!gameVersion) {
                res.status(404).send({ message: `Game version not found`});
                return;
            }

            let modVersionIds = Validator.zDBIDArray.safeParse(req.body.modVersionIds);
            if (!modVersionIds.success) {
                res.status(400).send({ message: `Invalid mod version IDs`});
                return;
            }

            if (await Validator.validateIDArray(modVersionIds.data, `modVersions`, false, false) == false) {
                res.status(404).send({ message: `One or more mod versions not found`});
                return;
            }

            let modVersions = await DatabaseHelper.database.ModVersions.findAll({ where: { id: modVersionIds.data } });

            let results = {
                editIds: [] as number[],
                errorIds: [] as number[],
                editPreformedIds: [] as number[],
            };

            for (let modVersion of modVersions) {
                let outObj = await modVersion.addGameVersionId(gameVersion.id, session.user.id);
                if (outObj) {
                    if (outObj instanceof EditQueue) {
                        results.editIds.push(outObj.id);
                    } else {
                        results.editPreformedIds.push(outObj.id);
                    }
                } else {
                    results.errorIds.push(modVersion.id);
                }
            }

            res.status(200).send(results);
        });

        this.router.post(`/ba/approveEdits`, async (req, res) => {
            /*
            #swagger.tags = ['Bulk Actions']
            #swagger.summary = 'Approve multiple edit requests'
            #swagger.description = 'Approve multiple edit requests. Requires the user to be an approver.'
            #swagger.requestBody = {
                schema: {
                    "editIds": [1, 2, 3]
                }
            }
                    
            #swagger.responses[200] = {
                description: 'Success',
                schema: {
                    "successIds": [1, 2],
                    "errorIds": [3]
                }
            }
            */
            let session = await validateSession(req, res, true);
            if (!session.user) {
                return;
            }

            let editIds = Validator.zDBIDArray.safeParse(req.body.editIds);
            if (!editIds.success) {
                res.status(400).send({ message: `Invalid edit IDs`});
                return;
            }

            if (await Validator.validateIDArray(editIds.data, `editQueue`, false, false) == false) {
                res.status(404).send({ message: `One or more edits not found`});
                return;
            }

            let edits = await DatabaseHelper.database.EditApprovalQueue.findAll({ where: { id: editIds.data, approved: { [Op.ne]: true } } });

            if (edits.length == 0 || edits.length != editIds.data.length) {
                res.status(404).send({ message: `One or more edits are already approved or not found` });
                return;
            }

            let results = {
                successIds: [] as number[],
                errorIds: [] as number[],
            };

            for (let edit of edits) {
                try {
                    await edit.approve(session.user);
                    results.successIds.push(edit.id);
                } catch (e) {
                    results.errorIds.push(edit.id);
                }
            }

            res.status(200).send(results);
        });
    }
}