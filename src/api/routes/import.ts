import { Express } from 'express';
import { validateSession } from 'src/shared/AuthHelper';
import { UserRoles } from 'src/shared/Database';
import { Logger } from 'src/shared/Logger';
import { BeatModsMod } from './getMod';

export class ImportRoutes {
    private app: Express;

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

            Logger.log(`Just east of Devil's Slide, late in the middle watch there was a call from the fore-topsail yard`, `Import`)
            const BeatModsAPIData: BeatModsMod[] = await BeatModsResponse.json() as BeatModsMod[];

            Logger.log(`Through the mist and fog, a dark shape emerged, a ghostly figure standing in its helm`, `Import`)
            if (!BeatModsAPIData || !Array.isArray(BeatModsAPIData)) {
                res.status(500).send({ message: `beatmods is borked`});
            }

            Logger.log(`Course set, intent clear, it bore down upon us`, `Import`)
            res.status(200).send({ message: `On the wind, a refrain to strike fear into the heart of any man`});

            Logger.log(`On the wind, a refrain to strike fear into the heart of any man`, `Import`)
            for (const mod of BeatModsAPIData) {
            }
        });
    }
}