import { Express } from 'express';
import { Categories, DatabaseHelper, ModVersion } from '../../shared/Database';

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

        this.app.get(`/api/mod/beatmods`, async (req, res) => {
            let version = req.query.version;

            let modArray: BeatModsMod[] = [];

            if (!version || typeof version !== `string`) {
                return res.status(400).send({message: `Missing Game Version`});
            }

            let gameVersion = await DatabaseHelper.database.GameVersions.findOne({ where: { gameName: `Beat Saber`, version: version}});
            if (gameVersion) {
                return res.status(400).send({message: `No valid game version.`});
            }

            let mods = await DatabaseHelper.database.Mods.findAll();
            for (let mod of mods) {
                let modVersion = await mod.getLatestVersion(gameVersion.id);

                let dependancies = [];

                for (let dependancy of modVersion.dependancies) {
                    dependancies.push({
                        _id: dependancy.toString(),
                        name: dependancy.toString()
                    })
                }

                modArray.push({
                    name: mod.name,
                    description: mod.description,
                    version: modVersion.modVersion.toString(),
                    gameVersion: gameVersion.version,
                    author: {
                        _id: modVersion.authorId.toString(),
                        username: modVersion.authorId.toString(),
                        lastLogin: `null`
                    },
                    status: modVersion.visibility,
                    link: mod.gitUrl,
                    category: mod.category,
                    downloads: [{
                        type: modVersion.platform,
                        url: `null`,
                        hashMd5: modVersion.contentHashes.map((hash) => {
                            return {
                                hash: hash.hash,
                                file: hash.path
                            };
                        })
                    }],
                    dependencies: dependancies,
                    _id: modVersion.id.toString(),
                    required: (mod.category === Categories.Core),
                });
            }

            res.status(200).send(modArray);
        });
    }
}

export type BeatModsMod = {
    name: string,
    version: string,
    gameVersion: string,
    author: {
        _id: string,
        username: string,
        lastLogin: string,
    },
    status: string,
    description: string,
    link: string,
    category: string,
    required: boolean,
    downloads: {
        type: string,
        url: string,
        hashMd5: {
            hash: string,
            file: string,
        }[],
    }[],
    dependencies: BeatModsMod | {name: string, _id: string}[],
    _id: string,
}