import { Express } from 'express';
import { Categories, DatabaseHelper, GameVersion, Mod, ModVersion, SupportedGames, Visibility } from '../../shared/Database';
import { Logger } from '../../shared/Logger';

export class GetModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/mods`, async (req, res) => {
            // #swagger.tags = ['Mods']
            // #swagger.description = 'Get all mods.'
            // #swagger.responses[200] = { description: 'Returns all mods.' }

            return res.status(200).send({ mods: DatabaseHelper.cache.mods });
        });

        this.app.get(`/api/mod/:modIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            let modId = parseInt(req.params.modIdParam);
            if (!modId) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = DatabaseHelper.cache.mods.find((mod) => mod.id === modId);
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }
            let modVersions = DatabaseHelper.cache.modVersions.filter((modVersion) => modVersion.modId === mod.id);
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

            for (let version of DatabaseHelper.cache.modVersions) {
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
            let version = req.query.gameVersion || `1.39.0`;

            let modArray: BeatModsMod[] = [];

            if (!version || typeof version !== `string`) {
                return res.status(400).send({message: `Missing Game Version`});
            }

            let gameVersion = DatabaseHelper.cache.gameVersions.find((gameVersion) => gameVersion.version === version && gameVersion.gameName === SupportedGames.BeatSaber);
            if (!gameVersion) {
                return res.status(400).send({message: `No valid game version.`});
            }

            let mods = DatabaseHelper.cache.mods.filter((mod) => mod.gameName === SupportedGames.BeatSaber);
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
                    let dependancyModVesion = DatabaseHelper.cache.modVersions.find((modVersion) => modVersion.id === dependancyId);
                    let dependancyMod = DatabaseHelper.cache.mods.find((mod) => mod.id === dependancyModVesion.modId);
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
        
        let author = DatabaseHelper.cache.users.find((user) => user.id === modVersion.authorId);
        let status = `private`;
        switch (modVersion.visibility) {
            case Visibility.Private:
                status = `declined`;
                break;
            case Visibility.Unverified:
                status = `pending`;
                break;
            case Visibility.Verified:
                status = `approved`;
                break;
            case Visibility.Removed:
                status = `declined`;
                break;
            default:
                status = `declined`;
                break;
        }


        return {
            _id: modVersion.id.toString(),
            name: mod.name.toString(),
            version: modVersion.modVersion.raw,
            gameVersion: gameVersion.version,
            authorId: author.id.toString(),
            updatedDate: modVersion.updatedAt.toUTCString(),
            uploadedDate: modVersion.createdAt.toUTCString(),
            author: doResolution ? {
                _id: author.id.toString(),
                username: author.username.toString(),
                lastLogin: author.createdAt.toString(),
            } : undefined,
            status: status,
            description: mod.description,
            link: mod.gitUrl,
            category: mod.category,
            downloads: [{
                type: modVersion.platform,
                url: `/cdn/mod/${modVersion.zipHash}.zip`, //tbd
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
    authorId: string,
    author: {
        _id: string,
        username: string,
        lastLogin: string,
    } | undefined,
    uploadedDate: string,
    updatedDate: string,
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