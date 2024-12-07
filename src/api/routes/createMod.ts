import { Express } from 'express';
import path from 'node:path';
import { DatabaseHelper, ContentHash, Visibility } from '../../shared/Database';
import JSZip from 'jszip';
import crypto from 'crypto';
import { validateSession } from '../../shared/AuthHelper';
import { Config } from '../../shared/Config';

export class CreateModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.post(`/api/mod/create`, async (req, res) => {
            // #swagger.tags = ['Mods']
            let session = await validateSession(req, res, true);
            let name = req.body.name;
            let description = req.body.description;
            let gitUrl = req.body.gitUrl;
            let file = req.files?.file;

            //#region Request Validation
            if (!name || !description || !gitUrl || typeof name !== `string` || typeof description !== `string` || typeof gitUrl !== `string` || name.length < 1 || description.length < 1) {
                return res.status(400).send({ message: `Missing name or description.` });
            }

            if (!file || Array.isArray(file) || file.size > 8 * 1024 * 1024) {
                return res.status(413).send({ error: `Invalid file (Might be too large, 8MB max.)` });
            }
            
            let isAcceptableImage = (file.mimetype !== `image/png` && file.name.endsWith(`.png`)) || (file.mimetype !== `image/jpeg` && (file.name.endsWith(`.jpeg`) || file.name.endsWith(`.jpg`)) || (file.mimetype !== `image/webp` && file.name.endsWith(`.webp`)));

            if (!isAcceptableImage) {
                return res.status(400).send({ error: `Invalid file type.` });
            }
            //#endregion

            DatabaseHelper.database.Mods.create({
                name: name,
                description: description,
                authorIds: [session.user.id],
                gitUrl: gitUrl,
                iconFileName: `${file.md5}${path.extname(file.name)}`,
                visibility: Visibility.Unverified,
            }).then((mod) => {
                file.mv(`${path.resolve(Config.storage.iconsDir)}/${file.md5}${path.extname(file.name)}`);
                return res.status(200).send({ mod });
            }).catch((error) => {
                return res.status(500).send({ message: `Error creating mod: ${error}` });
            });
        });

        this.app.post(`/api/mod/:modIdParam/upload`, async (req, res) => {
            // #swagger.tags = ['Mods']
            let session = await validateSession(req, res, true);
            let modId = parseInt(req.params.modIdParam);
            let gameVersions = Config.devmode ? JSON.parse(req.body.gameVersions) : req.body.gameVersions;
            let modVersion = req.body.modVersion;
            let dependencies = req.body.dependencies;
            let platform = req.body.platform;

            let file = req.files?.file;
            //#region Request Validation
            if (!modId || isNaN(modId) || !modVersion || !file || !platform || !DatabaseHelper.isValidPlatform(platform)) {
                return res.status(400).send({ message: `Missing valid modId, gameVersions, modVersion, platform, or file.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (!mod.authorIds.includes(session.user.id)) {
                return res.status(401).send({ message: `You cannot upload to this mod.` });
            }

            if (dependencies && Array.isArray(dependencies)) {
                for (let dependancy of dependencies) {
                    if (typeof dependancy !== `number`) {
                        return res.status(400).send({ message: `Invalid game version. (Reading ${dependancy})` });
                    }
                    let dependancyMod = await DatabaseHelper.database.Mods.findOne({ where: { id: dependancy } });
                    if (!dependancyMod) {
                        return res.status(404).send({ message: `Dependancy mod (${dependancy}) not found.` });
                    }
                }
            }

            if (!gameVersions || !Array.isArray(gameVersions)) {
                for (let version of gameVersions) {
                    if (typeof version !== `number`) {
                        return res.status(400).send({ message: `Invalid game version. (Reading ${version})` });
                    }
                    let gameVersionDB = await DatabaseHelper.database.Mods.findOne({ where: { id: version } });
                    if (!gameVersionDB) {
                        return res.status(404).send({ message: `Game version (${version}) not found.` });
                    }
                }
            }


            if (!file || Array.isArray(file) || file.size > 50 * 1024 * 1024) {
                return res.status(413).send({ error: `File missing or too large.` });
            }
            //#endregion
            let isZip = file.mimetype !== `application/zip` && file.name.endsWith(`.zip`);
            let hashs: ContentHash[] = [];
            if (isZip) {
                await JSZip.loadAsync(file.data).then(async (zip) => {
                    let files = zip.files;
                    for (let file in files) {
                        if (file.endsWith(`/`)) {
                            continue;
                        }

                        let fileData = await files[file].async(`nodebuffer`);
                        const md5 = crypto.createHash(`md5`);
                        let result = md5.update(fileData).digest(`hex`);
                        hashs.push({ path: file, hash: result });
                    }
                });
            } else {
                return res.status(400).send({ error: `File must be a zip archive.` });
            }

            file.mv(`${path.resolve(Config.storage.uploadsDir)}/${file.md5}${path.extname(file.name)}`);

            DatabaseHelper.database.ModVersions.create({
                modId: modId,
                authorId: session.user.id,
                visibility: Visibility.Unverified,
                supportedGameVersionIds: gameVersions,
                modVersion: modVersion,
                dependencies: dependencies ? dependencies : [],
                platform: platform,
                contentHashes: hashs,
                zipHash: file.md5,
            }).then((modVersion) => {
                res.status(200).send({ modVersion });
            }).catch((error) => {
                res.status(500).send({ message: `Error creating mod version: ${error}` });
            });

        });
    }
}