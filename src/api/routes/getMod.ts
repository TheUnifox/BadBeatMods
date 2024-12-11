import { Express } from 'express';
import { Categories, DatabaseHelper, GameVersion, Mod, ModVersion } from '../../shared/Database';
import { Logger } from '../../shared/Logger';

export class GetModRoutes {
    private app: Express;
    private modCache: Mod[] = [];
    private modVersionCache: ModVersion[] = [];
    //private gameVersionCache: GameVersion[] = [];

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();

        setInterval(async () => {
            this.modCache = await DatabaseHelper.database.Mods.findAll();
            this.modVersionCache = await DatabaseHelper.database.ModVersions.findAll();
            //this.gameVersionCache = await DatabaseHelper.database.GameVersions.findAll();
        }, 1000 * 60 * 1);
    }

    private async loadRoutes() {
        this.app.get(`/api/mods`, async (req, res) => {
            // #swagger.tags = ['Mods']
            // #swagger.description = 'Get all mods.'
            // #swagger.responses[200] = { description: 'Returns all mods.' }

            return res.status(200).send({ mods: this.modCache });
        });

        this.app.get(`/api/mod/:modIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            let modId = parseInt(req.params.modIdParam);
            if (!modId) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = this.modCache.find((mod) => mod.id === modId);
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }
            let modVersions = this.modVersionCache.filter((modVersion) => modVersion.modId === mod.id);
            let returnVal: any[] = [];

            for (let version of (modVersions)) {
                returnVal.push(await version.toAPIResonse());
            }

            return res.status(200).send({ mod: { info: mod, versions: returnVal } });
        });

        this.app.get(`/api/hashlookup`, async (req, res) => {
            // #swagger.tags = ['Mods']
            let hash = req.query.hash;
            if (!hash) {
                return res.status(400).send({ message: `Missing hash.` });
            }

            for (let version of this.modVersionCache) {
                for (let fileHash of version.contentHashes) {
                    if (fileHash.hash === hash) {
                        return res.status(200).send({ mod: version.modId });
                    }
                }
            }
            return res.status(404).send({ message: `Hash not founds.` });
        });

        this.app.get(`/api/beatmods/mod`, async (req, res) => {
            // #swagger.tags = ['Mods']
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
                if (!modVersion) {
                    continue;
                }

                modArray.push(this.convertToBeatmodsMod(mod, modVersion, gameVersion));
            }

            return res.status(200).send(modArray);
        });
    }

    private convertToBeatmodsMod(mod: Mod, modVersion:ModVersion, gameVersion: GameVersion, doResolution:boolean = true): BeatModsMod {
        let dependencies: (BeatModsMod | string)[] = [];
    
        if (modVersion.dependencies.length !== 0) {
            for (let dependancyId of modVersion.dependencies) {
                if (doResolution) {
                    let dependancyModVesion = this.modVersionCache.find((modVersion) => modVersion.id === dependancyId);
                    let dependancyMod = this.modCache.find((mod) => mod.id === dependancyModVesion.modId);
                    if (dependancyMod) {
                        dependencies.push(this.convertToBeatmodsMod(dependancyMod, dependancyModVesion, gameVersion, false));
                    } else {
                        Logger.warn(`Dependancy ${dependancyId} for mod ${mod.name} v${modVersion.modVersion.raw} was unable to be resolved`, `getMod`); // in theory this should never happen, but i wanna know when it does lol
                    }
                } else {
                    dependencies.push(dependancyId.toString());
                }
            }
        }
    
        return {
            _id: modVersion.id.toString(),
            name: mod.name.toString(),
            version: modVersion.modVersion.raw,
            gameVersion: gameVersion.version,
            author: doResolution ? {
                _id: modVersion.authorId.toString(),
                username: modVersion.authorId.toString(),
                lastLogin: new Date().toISOString()
            } : modVersion.authorId.toString(),
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
            dependencies: doResolution ? dependencies as BeatModsMod[] : dependencies as string[],
            required: (mod.category === Categories.Core),
        };
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
    } | string,
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
    dependencies: BeatModsMod[] | string[],
    _id: string,
}