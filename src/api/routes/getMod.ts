import { UploadedFile } from 'express-fileupload';
import { Express } from 'express';
import path from 'node:path';
import { DatabaseHelper, ContentHash, User, isValidPlatform, ModVisibility } from '../../shared/Database';
import JSZip from 'jszip';
import crypto from 'crypto';
import { storage, devmode } from '../../../storage/config.json';

export class GetModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/mod/:modIdParam`, async (req, res) => {
            let modId = parseInt(req.params.modIdParam);
            if (!modId) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }
            let versions = await DatabaseHelper.database.ModVersions.findAll({ where: { modId: modId } });


            return res.status(200).send({ mod: { info: mod, versions: versions } });
        });
    }
}