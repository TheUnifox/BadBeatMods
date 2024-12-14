import { Express } from 'express';
import { Categories, DatabaseHelper, GameVersion, Mod, ModVersion, SupportedGames, Visibility } from '../../shared/Database';
import { Logger } from '../../shared/Logger';
import { HTTPTools } from '../../shared/HTTPTools';

export class GetModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.get(`/api/mods`, async (req, res) => {
            // #swagger.tags = ['Mods']
            // #swagger.summary = 'Get all mods for a specified version.'
            // #swagger.description = 'Get all mods.<br><br>If gameName is not provided, it will default to Beat Saber.<br>If gameVersion is not provided, it will default to whatever is set as the lastest version for the selected game.'
            // #swagger.responses[200] = { description: 'Returns all mods.' }
            // #swagger.responses[400] = { description: 'Invalid gameVersion.' }
            // #swagger.parameters['gameName'] = { description: 'The game name.', type: 'string' }
            // #swagger.parameters['gameVersion'] = { description: 'The game version (ex. \'1.29.1\', \'1.40.0\').', type: 'string' }
            let gameName = req.query.gameName;
            let gameVersion = req.query.gameVersion;

            let filteredGameName = (gameName && HTTPTools.validateStringParameter(gameName) && DatabaseHelper.isValidGameName(gameName)) ? gameName : SupportedGames.BeatSaber;
            let filteredGameVersion = (gameVersion && HTTPTools.validateStringParameter(gameVersion) && DatabaseHelper.isValidGameVersion(filteredGameName, gameVersion)) ? gameVersion : await GameVersion.getDefaultVersion(filteredGameName);

            if (gameVersion && HTTPTools.validateStringParameter(gameVersion) && !DatabaseHelper.isValidGameVersion(filteredGameName, gameVersion)) {
                return res.status(400).send({ message: `Invalid gameVersion.` });
            }
            
            let mods:{mod: Mod, latest: any}[] = [];
            for (let mod of DatabaseHelper.cache.mods) {
                if (mod.gameName !== filteredGameName) {
                    continue;
                }

                // if the mod isn't verified or unverified, don't show it
                if (mod.visibility != Visibility.Unverified && mod.visibility != Visibility.Verified) {
                    continue;
                }

                let latest = await mod.getLatestVersion(DatabaseHelper.cache.gameVersions.find((gameVersion) => gameVersion.version === filteredGameVersion && gameVersion.gameName === filteredGameName)?.id);
                if (latest) {
                    // if the modVersion isn't verified or unverified, don't show it
                    if (latest.visibility != Visibility.Unverified && latest.visibility != Visibility.Verified) {
                        continue;
                    }
                    mods.push({mod: mod, latest: await latest.toAPIResonse()});
                }
            }

            return res.status(200).send({ mods });
        });

        this.app.get(`/api/mods/:modIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            // #swagger.summary = 'Get a specific mod by ID.'
            // #swagger.description = 'Get a specific mod by ID. This will also return every version of the mod.'
            // #swagger.responses[200] = { description: 'Returns the mod.' }
            // #swagger.responses[400] = { description: 'Invalid mod id.' }
            // #swagger.responses[404] = { description: 'Mod not found.' }
            // #swagger.parameters['modIdParam'] = { in: 'path', description: 'The mod ID.', type: 'number', required: true }
            let modId = parseInt(req.params.modIdParam);
            if (!modId) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }

            let mod = DatabaseHelper.cache.mods.find((mod) => mod.id === modId);
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (mod.visibility != Visibility.Unverified && mod.visibility != Visibility.Verified) {
                return res.status(404).send({ message: `Mod not found.` });
            }
            let modVersions = DatabaseHelper.cache.modVersions.filter((modVersion) => modVersion.modId === mod.id);
            let returnVal: any[] = [];

            for (let version of (modVersions)) {
                if (version.visibility != Visibility.Unverified && version.visibility != Visibility.Verified) {
                    continue;
                }
                returnVal.push(await version.toAPIResonse());
            }

            return res.status(200).send({ mod: { info: mod, versions: returnVal } });
        });

        this.app.get(`/api/hashlookup`, async (req, res) => {
            // #swagger.tags = ['Mods']
            // #swagger.summary = 'Show a mod that has a file with the specified hash.'
            // #swagger.description = 'Show a mod that has a file with the specified hash. This is useful for finding the mod that a file belongs to.'
            // #swagger.responses[200] = { description: 'Returns the mod.' }
            // #swagger.responses[400] = { description: 'Missing hash.' }
            // #swagger.responses[404] = { description: 'Hash not found.' }
            // #swagger.parameters['hash'] = { description: 'The hash to look up.', type: 'string', required: true }
            let hash = req.query.hash;
            if (!hash) {
                return res.status(400).send({ message: `Missing hash.` });
            }

            for (let version of DatabaseHelper.cache.modVersions) {
                if (version.zipHash === hash) {
                    return res.status(200).send({ mod: version.modId });
                }
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
            // #swagger.summary = 'Legacy BeatMods API endpoint.'
            // #swagger.description = 'Legacy BeatMods API endpoint. This is available for mod downloaders that have not been updated to use the new API.'
            // #swagger.responses[200] = { description: 'Returns all mods.' }
            // #swagger.responses[400] = { description: 'Missing Game Version.' }
            // #swagger.parameters['gameVersion'] = { description: 'The game version as a string (ex. \'1.29.1\', \'1.40.0\').', type: 'string' }
            // #swagger.parameters['status'] = { description: 'The statuses to return. Available statuses are: \`approved\` & \`pending\`', type: 'string' }
            // #swagger.deprecated = true
            let version = req.query.gameVersion || GameVersion.getDefaultVersion(SupportedGames.BeatSaber);
            let status = req.query.status || `approved`;

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
                if (mod.visibility !== Visibility.Verified && (mod.visibility === Visibility.Unverified || status !== `approved`)) {
                    continue;
                }
                let modVersion = await mod.getLatestVersion(gameVersion.id);
                if (!modVersion) {
                    continue;
                }
                if (modVersion.visibility !== Visibility.Verified && (modVersion.visibility === Visibility.Unverified || status !== `approved`)) {
                    continue;
                }

                modArray.push(await this.convertToBeatmodsMod(mod, modVersion, gameVersion));
            }

            return res.status(200).send(modArray);
        });
    }

    private async convertToBeatmodsMod(mod: Mod, modVersion:ModVersion, gameVersion: GameVersion, doResolution:boolean = true): Promise<BeatModsMod> {
        let dependencies: (BeatModsMod | string)[] = [];
    
        if (modVersion.dependencies.length !== 0) {
            for (let dependancy of (await modVersion.getDependencies(gameVersion.id))) {
                if (doResolution) {
                    let dependancyMod = DatabaseHelper.cache.mods.find((mod) => mod.id === dependancy.modId);
                    if (dependancyMod) {
                        dependencies.push(await this.convertToBeatmodsMod(dependancyMod, dependancy, gameVersion, false));
                    } else {
                        Logger.warn(`Dependancy ${dependancy.id} for mod ${mod.name} v${modVersion.modVersion.raw} was unable to be resolved`, `getMod`); // in theory this should never happen, but i wanna know when it does lol
                    }
                } else {
                    dependencies.push(dependancy.id.toString());
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