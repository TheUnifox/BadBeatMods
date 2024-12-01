import { Express } from 'express';
import { DatabaseHelper } from '../../shared/Database';

export class GetModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/mods`, async (req, res) => {
            let mods = await DatabaseHelper.database.Mods.findAll();
            return res.status(200).send({ mods });
        });

        this.app.get(`/api/mod/:modIdParam`, async (req, res) => {
            let modId = parseInt(req.params.modIdParam);
            if (!modId) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }
            let versions: any[] = [];

            for (let version of (await DatabaseHelper.database.ModVersions.findAll({ where: { modId: modId } }))) {
                versions.push(version.toJSONWithGameVersions());
            }

            return res.status(200).send({ mod: { info: mod, versions: versions } });
        });

        this.app.get(`/api/hashlookup`, async (req, res) => {
            let hash = req.query.hash;
            if (!hash) {
                return res.status(400).send({ message: `Missing hash.` });
            }

            let versions = await DatabaseHelper.database.ModVersions.findAll();

            if (!versions) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            for (let version of versions) {
                for (let fileHash of version.contentHashes) {
                    if (fileHash.hash === hash) {
                        return res.status(200).send({ mod: version.modId });
                    }
                }
            }
            return res.status(404).send({ message: `Hash not founds.` });
        });

    }
}