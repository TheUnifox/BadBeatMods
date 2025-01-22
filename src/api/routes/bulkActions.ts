import { Router } from 'express';
import { DatabaseHelper, EditQueue, GameVersion, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Validator } from 'src/shared/Validator';

export class BulkActionsRoutes {
    private router: Router;
    constructor(router: Router) {
        this.router = router;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.router.post(`/ba/addGameVersion`, async (req, res) => {
            // #swagger.tags = ['Bulk Actions']
            // #swagger.description = 'Add a game version to multiple mod versions'
            /* #swagger.parameters['body'] = {
                    in: 'body',
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
    }
}