import { Express } from 'express';
import path from 'node:path';
import { DatabaseHelper, ContentHash, isValidPlatform, ModVisibility } from '../../shared/Database';
import JSZip from 'jszip';
import crypto from 'crypto';
import { storage, devmode } from '../../../storage/config.json';

export class CreateModRoutes {
    private app: Express;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.post(`/api/mod/create`, async (req, res) => {
            let sessionId = req.session.userId;
            let name = req.body.name;
            let description = req.body.description;
            let infoUrl = req.body.infoUrl;
            let game = req.body.game;
            let file = req.files.file;

            //#region Request Validation
            if (!name || !description || infoUrl || typeof name !== `string` || typeof description !== `string` || typeof infoUrl !== `string` || name.length < 1 || description.length < 1) {
                return res.status(400).send({ message: `Missing name or description.` });
            }

            if (!sessionId) {
                return res.status(401).send({ message: `Unauthorized.` });
            }

            let user = await DatabaseHelper.database.Users.findOne({ where: { id: sessionId } });
            if (!user) {
                return res.status(401).send({ message: `Unauthorized.` });
            }

            if (Array.isArray(file) || file.size > 8 * 1024 * 1024) {
                return res.status(413).send({ error: `File too large (8MB Max).` });
            }
            
            let isAcceptableImage = (file.mimetype !== `image/png` && file.name.endsWith(`.zip`)) || (file.mimetype !== `image/jpeg` && (file.name.endsWith(`.jpeg`) || file.name.endsWith(`.jpg`)) || (file.mimetype !== `image/webp` && file.name.endsWith(`.webp`)));

            if (!isAcceptableImage) {
                return res.status(400).send({ error: `Invalid file type.` });
            }
            //#endregion

            DatabaseHelper.database.Mods.create({
                name: name,
                description: description,
                authorIds: [sessionId],
                infoUrl: infoUrl,
                iconFileExtension: path.extname(file.name),
                game: game,
            }).then((mod) => {
                file.mv(`${path.resolve(storage.iconsDir)}/${mod.id}${path.extname(file.name)}`);
                return res.status(200).send({ mod });
            }).catch((error) => {
                return res.status(500).send({ message: `Error creating mod: ${error}` });
            });
        });

        this.app.post(`/api/mod/:modIdParam/upload`, async (req, res) => {
            let sessionId = req.session.userId;
            let modId = parseInt(req.params.modIdParam);
            let gameVersion = devmode ? JSON.parse(req.body.gameVersion) : req.body.gameVersion;
            let modVersion = req.body.modVersion;
            let dependancies = req.body.dependancies;
            let platform = req.body.platform;

            let file = req.files.file;
            //#region Request Validation
            if (!sessionId) {
                return res.status(401).send({ message: `Unauthorized.` });
            }

            if (!modId || !gameVersion || !modVersion || !file || !platform || !Array.isArray(gameVersion) || !isValidPlatform(platform)) {
                return res.status(400).send({ message: `Missing valid modId, gameVersions, modVersion, platform, or file.` });
            }

            let user = await DatabaseHelper.database.Users.findOne({ where: { id: sessionId } });
            if (!user) {
                return res.status(401).send({ message: `Unauthorized.` });
            }

            let mod = await DatabaseHelper.database.Mods.findOne({ where: { id: modId } });
            if (!mod) {
                return res.status(404).send({ message: `Mod not found.` });
            }

            if (dependancies && Array.isArray(dependancies)) {
                for (let dependancy of dependancies) {
                    let dependancyMod = await DatabaseHelper.database.Mods.findOne({ where: { id: dependancy } });
                    if (!dependancyMod) {
                        return res.status(404).send({ message: `Dependancy mod not found.` });
                    }
                }
            }

            if (Array.isArray(file) || file.size > 50 * 1024 * 1024) {
                return res.status(413).send({ error: `File too large.` });
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

            file.mv(`${path.resolve(storage.uploadsDir)}/${file.md5}${path.extname(file.name)}`);

            DatabaseHelper.database.ModVersions.create({
                modId: modId,
                authorId: sessionId,
                visibility: ModVisibility.Unverified,
                supportedGameVersions: gameVersion,
                modVersion: modVersion,
                dependancies: dependancies ? dependancies : [],
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