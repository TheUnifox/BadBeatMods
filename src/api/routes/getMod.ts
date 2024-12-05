import { Express } from 'express';
import { Categories, DatabaseHelper, GameVersion, Mod, ModVersion } from '../../shared/Database';
import { Logger } from '../../shared/Logger';

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
            let modVersions = await DatabaseHelper.database.ModVersions.findAll({ where: { modId: modId } });
            let returnVal: any[] = [];

            for (let version of (modVersions)) {
                returnVal.push(await version.toJSONWithGameVersions());
            }

            return res.status(200).send({ mod: { info: mod, versions: returnVal } });
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

        this.app.get(`/api/beatmods/mod`, async (req, res) => {
            let version = req.query.version;

            let modArray: BeatModsMod[] = [];

            if (!version || typeof version !== `string`) {
                return res.status(400).send({message: `Missing Game Version`});
            }

            let gameVersion = await DatabaseHelper.database.GameVersions.findOne({ where: { gameName: `Beat Saber`, version: version}});
            if (!gameVersion) {
                return res.status(400).send({message: `No valid game version.`});
            }

            let mods = await DatabaseHelper.database.Mods.findAll();
            for (let mod of mods) {
                let modVersion = await mod.getLatestVersion(gameVersion.id);

                modArray.push(await convertToBeatmodsMod(mod, modVersion, gameVersion));
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
    dependencies: BeatModsMod[] | {name: string, _id: string}[],
    _id: string,
}

async function convertToBeatmodsMod(mod: Mod, modVersion:ModVersion, gameVersion: GameVersion, doDependancyResolution:boolean = true): Promise<BeatModsMod> {
    let dependencies = [];
    for (let dependancy of modVersion.dependencies) {
        if (doDependancyResolution) {
            let dependancyMod = await DatabaseHelper.database.Mods.findOne({ where: { id: dependancy } });
            if (dependancyMod) {
                dependencies.push(await convertToBeatmodsMod(dependancyMod, await dependancyMod.getLatestVersion(gameVersion.id), gameVersion, false));
            } else {
                Logger.warn(`Dependancy ${dependancy} for mod ${mod.name} v${modVersion.modVersion.raw} was unable to be resolved`, `getMod`); // in theory this should never happen, but i wanna know when it does lol
            }
        } else {
            dependencies.push({
                _id: dependancy.toString(),
                name: dependancy.toString()
            });
        }
    }

    return {
        _id: modVersion.id.toString(),
        name: mod.name.toString(),
        version: modVersion.modVersion.raw,
        gameVersion: gameVersion.version,
        author: {
            _id: modVersion.authorId.toString(),
            username: modVersion.authorId.toString(),
            lastLogin: new Date().toISOString()
        },
        status: modVersion.visibility,
        description: mod.description,
        link: mod.gitUrl,
        category: mod.category,
        downloads: [{
            type: modVersion.platform,
            url: `null`, //tbd
            hashMd5: modVersion.contentHashes.map((hash) => {
                return {
                    hash: hash.hash,
                    file: hash.path
                };
            })
        }],
        dependencies: dependencies,
        required: (mod.category === Categories.Core),
    };
}