import { Express } from 'express';
import { DatabaseHelper } from '../../shared/Database';

export class MiscRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/versions`, async (req, res) => {
            // #swagger.tags = ['Misc']
            let versions = DatabaseHelper.cache.gameVersions;

            return res.status(200).send({ versions });
        });
    }
}