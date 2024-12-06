import { Express } from 'express';
import { validateSession } from '../../shared/AuthHelper';
import { Categories, ContentHash, DatabaseHelper, ModVersion, Platform, UserRoles, Visibility } from '../../shared/Database';
import { Logger } from '../../shared/Logger';
import { BeatModsMod } from './getMod';
import { SemVer, coerce } from 'semver';
import crypto from 'crypto';
import { Config } from '../../shared/Config';
import path from 'path';
import fs from 'fs';
import { exit } from 'process';

export class ImportRoutes {
    private app: Express;
    private readonly ENABLE_DOWNLOADS = false;

    constructor(app: Express) {
        this.app = app;
        this.loadRoutes();
    }

    private async loadRoutes() {
        this.app.post(`/api/beatmods/importAll`, async (req, res) => {
            let session = await validateSession(req, res, UserRoles.Admin);
            
            // oh god oh fuck oh shit
            Logger.log(`Ere Jim, 'ave a seat an' I'll tell you a tale that'll cause your blood to run cold`, `Import`);

            const BeatModsResponse = await fetch(`https://beatmods.com/api/v1/mod?version=1.39.0`);
            Logger.log(`It was a dark and stormy night, three weeks out of Ilfracombe, Bound for the isle of Lundy`, `Import`);

            if (BeatModsResponse.status !== 200) {
                return res.status(500).send({ message: `beatmods is dead.`});
            }

            Logger.log(`Just east of Devil's Slide, late in the middle watch there was a call from the fore-topsail yard`, `Import`);
            const BeatModsAPIData: BeatModsMod[] = await BeatModsResponse.json() as BeatModsMod[];

            Logger.log(`Through the mist and fog, a dark shape emerged, a ghostly figure standing in its helm`, `Import`);
            if (!BeatModsAPIData || !Array.isArray(BeatModsAPIData)) {
                res.status(500).send({ message: `beatmods is borked`});
            }

            Logger.log(`Course set, intent clear, it bore down upon us`, `Import`);

            let importAuthor = await DatabaseHelper.database.Users.findOne({ where: { username: `BeatMods Import`, githubId: null } }); // this probably won't work

            if (!importAuthor) {
                importAuthor = await DatabaseHelper.database.Users.create({
                    username: `BeatMods Import`,
                    githubId: null,
                    roles: []
                });
            }
            res.status(200).send({ message: `On the wind, a refrain to strike fear into the heart of any man`});

            Logger.log(`On the wind, a refrain to strike fear into the heart of any man`, `Import`);

            let count = 0;
            let dependancyRecord: { dependancy: BeatModsMod, modVersionId: number}[] = [];
            for (const mod of BeatModsAPIData) {
                count++;
                
                if (mod.status == `declined`) {
                    continue;
                }

                let existingMod = await DatabaseHelper.database.Mods.findOne({ where: { name: mod.name } });
                let status = mod.status == `approved` || mod.status == `inactive` ? Visibility.Verified : Visibility.Unverified;

                if (!existingMod) {
                    let lowerCaseCatgory = mod.category.toLowerCase();
                    existingMod = await DatabaseHelper.database.Mods.create({
                        name: mod.name,
                        description: mod.description,
                        authorIds: [importAuthor.id],
                        category: DatabaseHelper.isValidCategory(lowerCaseCatgory) ? lowerCaseCatgory : Categories.Other,
                        visibility: status,
                        iconFileName: `default.png`,
                        gitUrl: mod.link,
                    });
                }

                if (count % 100 == 0) {
                    Logger.log(`${BeatModsAPIData.length - count} mods on the endpoint left`, `Import`);
                } else {
                    console.log(`${BeatModsAPIData.length - count} mods on the endpoint left`);
                }

                for (const download of mod.downloads) {
                    console.log(`Yo ho ho and a bottle of ${mod.name} v${mod.version} from ${download.url}`, `Import`);
                    let platform: Platform;

                    if (download.type == `steam`) {
                        platform = Platform.Steam;
                    } else if (download.type == `oculus`) {
                        platform = Platform.Oculus;
                    } else if (download.type == `universal`) {
                        platform = Platform.Universal;
                    }

                    let gameVersion = await DatabaseHelper.database.GameVersions.findOne({ where: { version: mod.gameVersion } });
                    if (!gameVersion) {
                        gameVersion = await DatabaseHelper.database.GameVersions.create({
                            version: mod.gameVersion,
                            gameName: `Beat Saber`,
                        });
                    }

                    if (!coerce(mod.version)) {
                        Logger.error(`Failed to parse Semver ${mod.version}`, `Import`);
                        continue;
                    }

                    let existingVersion = await ModVersion.checkForExistingVersion(existingMod.id, coerce(mod.version), gameVersion.id, platform);
                    if (existingVersion) {
                        Logger.warn(`Mod ${mod.name} v${mod.version} already exists in the database, skipping`, `Import`);
                        continue;
                    }

                    let result = `test`;
                    if (this.ENABLE_DOWNLOADS) {
                        let filefetch = await fetch(`https://beatmods.com${download.url}`);
                        let file = await filefetch.blob();
                        const md5 = crypto.createHash(`md5`);
                        let arrayBuffer = await file.arrayBuffer();
                        result = md5.update(new Uint8Array(arrayBuffer)).digest(`hex`);

                        fs.writeFileSync(`${path.resolve(Config.storage.uploadsDir)}/${result}.zip`, Buffer.from(arrayBuffer));
                    }

                    let newVersion = await DatabaseHelper.database.ModVersions.create({
                        modId: existingMod.id,
                        modVersion: coerce(mod.version),
                        supportedGameVersionIds: [gameVersion.id],
                        authorId: importAuthor.id,
                        zipHash: result, //this will break
                        visibility: status,
                        contentHashes: download.hashMd5.map(hash => { return { path: hash.file, hash: hash.hash };}) as ContentHash[],
                        platform: platform,
                        dependencies: [],
                    }).catch((err) => {
                        Logger.error(`Failed to create mod version ${mod.name} v${mod.version}`, `Import`);
                        console.error(err);
                        console.log(`its just one of those days`);
                        exit(1);
                    });

                    if (mod.dependencies.length >= 1) {
                        for (const dependancy of mod.dependencies) {
                            if (`version` in dependancy) {
                                dependancyRecord.push({ dependancy: dependancy, modVersionId: newVersion.id });
                            } else {
                                Logger.warn(`Dependancy ${dependancy.name} for mod ${mod.name} v${mod.version} is not resolved. Recursive dependancy?`, `Import`);
                            }
                        }
                    }
                }
            }
            Logger.log(`Send them to the depths`, `Import`);

            for (const record of dependancyRecord) {
                console.log(`Resolving dependancy ${record.dependancy.name} for mod ${record.modVersionId}`, `Import`);
                let mod = await DatabaseHelper.database.Mods.findOne({ where: { name: record.dependancy.name } });
                if (!mod) {
                    Logger.warn(`Dependancy ${record.dependancy.name} not found for mod ${record.modVersionId}`, `Import`);
                    continue;
                }

                let modVersion = await DatabaseHelper.database.ModVersions.findOne({ where: { id: record.modVersionId } });
                if (!modVersion) {
                    Logger.warn(`Mod version ${record.modVersionId} not found`, `Import`);
                    continue;
                }

                let dependancyModVersion = await DatabaseHelper.database.ModVersions.findOne({ where: { modId: mod.id, modVersion: record.dependancy.version } });
                if (!dependancyModVersion) {
                    Logger.warn(`Dependancy mod version ${record.dependancy.name} v${record.dependancy.version} not found`, `Import`);
                    continue;
                }

                //you may think its stupid but they force you to do this
                modVersion.dependencies = [...modVersion.dependencies, dependancyModVersion.id];
                await modVersion.save();
            }

            Logger.log(`Ah-ha-ha-ha-ha-ha-ha-ha-ha-Oah, where's me rum`, `Import`);
        });
    }
}