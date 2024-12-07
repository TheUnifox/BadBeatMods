import { Express } from 'express';
import { DatabaseHelper, UserRoles } from '../../shared/Database';
import { validateSession } from '../../shared/AuthHelper';
import { Logger } from '../../shared/Logger';

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
    }
}