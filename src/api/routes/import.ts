import { Express } from 'express';
import { validateSession } from '../../shared/AuthHelper';
import { Categories, ContentHash, DatabaseHelper, ModVersion, Platform, UserRoles, Visibility } from '../../shared/Database';
import { Logger } from '../../shared/Logger';
import { BeatModsMod } from './getMod';
import { SemVer } from 'semver';
import crypto from 'crypto';
import { Config } from 'src/shared/Config';
import path from 'path';
import fs from 'fs';

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

            const BeatModsResponse = await fetch(`https://beatmods.com/api/v1/mod`);
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
                    await DatabaseHelper.database.Mods.create({
                        name: mod.name,
                        description: mod.description,
                        authorIds: [importAuthor.id],
                        category: DatabaseHelper.isValidCategory(mod.category) ? mod.category : Categories.Other,
                        visibility: status,
                        iconFileName: `default.png`,
                        gitUrl: mod.link,
                    });
                }
                if (count % 10 == 0) {
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
                    let existingVersion = await DatabaseHelper.database.ModVersions.findOne({ where: { modId: existingMod.id, modVersion: mod.version, platform: platform } });
                    if (existingVersion) {
                        Logger.warn(`Mod ${mod.name} v${mod.version} already exists in the database, skipping`, `Import`);
                        continue;
                    }

                    let filefetch = await fetch(`https://beatmods.com${download.url}`);
                    let file = await filefetch.blob();
                    const md5 = crypto.createHash(`md5`);
                    let arrayBuffer = await file.arrayBuffer();
                    let result = md5.update(new Uint8Array(arrayBuffer)).digest(`hex`);

                    if (this.ENABLE_DOWNLOADS) {
                        fs.writeFileSync(`${path.resolve(Config.storage.uploadsDir)}/${result}.zip`, Buffer.from(arrayBuffer));
                    }

                    let newVersion = await DatabaseHelper.database.ModVersions.create({
                        modId: existingMod.id,
                        modVersion: new SemVer(mod.version),
                        supportedGameVersionIds: [],
                        zipHash: null, //this will break
                        visibility: status,
                        contentHashes: download.hashMd5.map(hash => { return { path: hash.file, hash: hash.hash };}) as ContentHash[],
                        platform: platform,
                        dependancies: [],
                    });

                    dependancyRecord.push({ dependancy: mod.dependencies as BeatModsMod, modVersionId: newVersion.id });
                }
            }

            for (const record of dependancyRecord) {
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

                modVersion.dependancies.push(dependancyModVersion.id);
                await modVersion.save();
            }
        });
    }
}