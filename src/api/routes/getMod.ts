import { Express } from 'express';
import { DatabaseHelper, Status, ModAPIResponse, GameVersion, UserRoles, User } from '../../shared/Database';
import { Validator } from '../../shared/Validator';
import { validateSession } from '../../shared/AuthHelper';

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
            // #swagger.parameters['status'] = { description: 'The status of the mod. Available status are: \'verified\'. Typing anything other than that will show you unverified mods too.', type: 'string' }
            // #swagger.parameters['platform'] = { description: 'The platform of the mod. Available platforms are: \'oculuspc\', \'universalpc\', \'steampc\'', type: 'string' }
            let reqQuery = Validator.zGetMods.safeParse(req.query);
            if (!reqQuery.success) {
                return res.status(400).send({ message: `Invalid parameters.`, errors: reqQuery.error.issues });
            }

            // set the default gameversion if it's not provided
            if (reqQuery.data.gameVersion === undefined || reqQuery.data.gameVersion === null) {
                await GameVersion.getDefaultVersion(reqQuery.data.gameName).then((gameVersion) => {
                    if (gameVersion) {
                        reqQuery.data.gameVersion = gameVersion;
                    } else {
                        return res.status(400).send({ message: `Invalid game version.` });
                    }
                });
            }

            // only show approved or unverified mods
            if (reqQuery.data.status !== Status.Verified && reqQuery.data.status !== Status.Unverified) {
                return res.status(400).send({ message: `Invalid status.` });
            }
            
            let mods:{mod: ModAPIResponse, latest: any}[] = [];
            let showUnverified = reqQuery.data.status !== `verified`;
            for (let mod of DatabaseHelper.cache.mods) {
                if (mod.gameName !== reqQuery.data.gameName) {
                    continue;
                }

                // if the mod isn't verified or unverified (with the unverified flag present), don't show it
                if (mod.status != Status.Verified && (mod.status != Status.Unverified || !showUnverified)) {
                    continue;
                }

                // get gameVersion ID
                let gameVersion = DatabaseHelper.cache.gameVersions.find((gameVersion) => gameVersion.version === reqQuery.data.gameVersion && gameVersion.gameName === reqQuery.data.gameName);
                if (!gameVersion) {
                    return res.status(400).send({ message: `Invalid game version.` });
                }

                // get the lastest mod for the selected platform (by default, universalpc. if another pc platform is selected, use that, but fallback to universalpc). inverted the showUnverified flag since the function operates on the opposite
                let latest = await mod.getLatestVersion(gameVersion.id, reqQuery.data.platform, !showUnverified);
                if (latest) {
                    // if the modVersion isn't verified or unverified, don't show it
                    if (latest.status != Status.Unverified && latest.status != Status.Verified) {
                        continue;
                    }
                    mods.push({ mod: mod.toAPIResponse(), latest: await latest.toAPIResonse(gameVersion.id, reqQuery.data.platform, !showUnverified) });
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
            // #swagger.parameters['raw'] = { description: 'Return the raw mod info.', type: 'boolean' }
            let session = await validateSession(req, res, false, null, false);
            let modId = Validator.zDBID.safeParse(req.params.modIdParam);
            if (!modId.success) {
                return res.status(400).send({ message: `Invalid mod id.` });
            }
            let parseRaw = Validator.zBool.safeParse(req.query.raw);
            let raw = false;
            if (parseRaw.success) {
                raw = parseRaw.data;
            }

            let mod = DatabaseHelper.cache.mods.find((mod) => mod.id === modId.data);
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            // if the mod isn't verified or unverified (with the unverified flag present), don't show it unless the user is an admin or approver or the mod author
            if (this.shouldShowItem(mod.authorIds, mod.status, session) == false) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            let modVersions = DatabaseHelper.cache.modVersions.filter((modVersion) => modVersion.modId === mod.id);
            let returnVal: any[] = [];

            for (let version of (modVersions)) {
                if (this.shouldShowItem(mod.authorIds, version.status, session) == false) {
                    continue;
                }
                // if raw is true, return the raw mod version info instead of attempting to resolve the dependencies & other fields
                if (raw) {
                    returnVal.push(await version.toRawAPIResonse());
                } else {
                    returnVal.push(await version.toAPIResonse());
                }
            }

            return res.status(200).send({ mod: { info: raw ? mod : mod.toAPIResponse(), versions: returnVal } });
        });

        this.app.get(`/api/modversions/:modVersionIdParam`, async (req, res) => {
            // #swagger.tags = ['Mods']
            // #swagger.summary = 'Get a specific mod version by ID.'
            // #swagger.description = 'Get a specific mod version by ID.'
            // #swagger.responses[200] = { description: 'Returns the mod version.' }
            // #swagger.responses[400] = { description: 'Invalid mod version id.' }
            // #swagger.responses[404] = { description: 'Mod version not found.' }
            // #swagger.parameters['modVersionIdParam'] = { in: 'path', description: 'The mod version ID.', type: 'number', required: true }
            // #swagger.parameters['raw'] = { description: 'Return the raw mod depedendcies without attempting to resolve them.', type: 'boolean' }
            let modVersionId = Validator.zDBID.safeParse(req.params.modVersionIdParam);
            let raw = req.query.raw;
            if (!modVersionId) {
                return res.status(400).send({ message: `Invalid mod version id.` });
            }

            let modVersion = DatabaseHelper.cache.modVersions.find((modVersion) => modVersion.id === modVersionId.data);
            if (!modVersion) {
                return res.status(404).send({ message: `Mod version not found.` });
            }

            // this does not check the mod as a whole, only the mod version's author. i'd prefer to not make another call to the database or the cache to get the mod's author
            if (this.shouldShowItem([modVersion.authorId], modVersion.status, await validateSession(req, res, false, null, false)) == false) {
                return res.status(404).send({ message: `Mod version not found.` });
            }

            if (raw === `true`) {
                return res.status(200).send({ modVersion: await modVersion.toRawAPIResonse() });
            } else {
                return res.status(200).send({ modVersion: await modVersion.toAPIResonse() });
            }
        });

        this.app.get(`/api/hashlookup`, async (req, res) => {
            // #swagger.tags = ['Mods']
            // #swagger.summary = 'Get a specific mod version that has a file with the specified hash.'
            // #swagger.description = 'Get a specific mod version that has a file with the specified hash. This is useful for finding the mod that a file belongs to.'
            // #swagger.responses[200] = { description: 'Returns the mod version.' }
            // #swagger.responses[400] = { description: 'Missing hash.' }
            // #swagger.responses[404] = { description: 'Hash not found.' }
            // #swagger.parameters['hash'] = { description: 'The hash to look up.', type: 'string', required: true }
            // #swagger.parameters['raw'] = { description: 'Return the raw mod depedendcies without attempting to resolve them.', type: 'boolean' }

            const hash = Validator.zString.min(8).safeParse(req.query.hash).data;
            const raw = Validator.zBool.safeParse(req.query.raw).data;

            if (!hash) {
                return res.status(400).send({ message: `Missing hash.` });
            }

            for (const version of DatabaseHelper.cache.modVersions) {
                if (version.zipHash === hash) {
                    return res.status(200).send({ modVersion: await (raw ? version.toRawAPIResonse() : version.toAPIResonse()) });
                }
                for (const fileHash of version.contentHashes) {
                    if (fileHash.hash === hash) {
                        return res.status(200).send({ modVersion: await (raw ? version.toRawAPIResonse() : version.toAPIResonse()) });
                    }
                }
            }
            return res.status(404).send({ message: `Hash not found.` });
        });
    }

    private shouldShowItem(authorIds: number[], status: Status, session: {approved: boolean, user: User}): boolean {
        if (status != Status.Unverified && status != Status.Verified) {
            if (!session.approved) {
                return false;
            }

            if (!session.user.roles.sitewide.includes(UserRoles.AllPermissions) && !session.user.roles.sitewide.includes(UserRoles.Approver) && !session.user.roles.sitewide.includes(UserRoles.Admin)) {
                return false;
            }

            if (authorIds.includes(session.user.id) == false) {
                return false;
            }
        }
        return true;
    }
}