import { WebhookClient } from "discord.js";
import { DatabaseHelper, Mod, ModVersion, User } from "./Database";
import { Config } from "./Config";
import { Logger } from "./Logger";

let webhookClient: WebhookClient;

export function addHooks() {
    Mod.afterCreate((mod, options) => {

    });
}

export async function sendModLog(mod: Mod, targetUser:User, action: `New` | `Approved` | `Rejected`) {
    if (!Config.webhooks.disableWebhooks) {
        if (!webhookClient) {
            webhookClient = new WebhookClient({ url: Config.webhooks.modLogUrl });
        }
        let authors:User[] = [];
        for (let author of mod.authorIds) {
            let authorDb = await DatabaseHelper.database.Users.findOne({ where: { id: author } });
            if (authorDb) {
                continue;
            }
            authors.push(authorDb);
        }
        if (authors.length === 0) {
            return Logger.error(`No authors found for mod ${mod.name}`);
        }

        let color = 0x00FF00;

        if (action === `Rejected`) {
            color = 0xFF0000;
        } else if (action === `Approved`) {
            color = 0x0000FF;
        }

        webhookClient.send({
            username: `BadBeatMods`,
            avatarURL: `${Config.server.url}/favicon.ico`,
            embeds: [
                {
                    title: `${action} Mod: ${mod.name}`,
                    url: `${Config.server.url}/api/mod/${mod.id}`,
                    description: `${mod.description} `,
                    author: {
                        name: `${targetUser.username} `,
                        icon_url: `https://github.com/${targetUser.username}.png`,
                    },
                    fields: [
                        {
                            name: `Authors`,
                            value: `${authors.map(author => { return author.username; }).join(`, `)} `,
                        },
                        {
                            name: `Category`,
                            value: `${mod.category} `,
                        },
                        {
                            name: `Git URL`,
                            value: `${mod.gitUrl} `,
                        },
                        
                    ],
                    thumbnail: {
                        url: `${Config.server.url}/cdn/icon/${mod.iconFileName}`,
                    },
                    color: color,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: `Mod ID: ${mod.id}`,
                        icon_url: `${Config.server.url}/favicon.ico`,
                    },
                },
            ],
        });
    }
}

export async function sendModVersionLog(modVersion: ModVersion, targetUser:User, action: `New` | `Approved` | `Rejected`, modObj?:Mod,) {
    if (!Config.webhooks.disableWebhooks) {
        if (!webhookClient) {
            webhookClient = new WebhookClient({ url: Config.webhooks.modLogUrl });
        }
        let author = await DatabaseHelper.database.Users.findOne({ where: { id: modVersion.authorId } });
        let mod = modObj ? modObj : await DatabaseHelper.database.Mods.findOne({ where: { id: modVersion.modId } });
        let gameVersions = (await modVersion.getSupportedGameVersions()).map((v) => v.version);

        let color = 0x00FF00;

        if (action === `Rejected`) {
            color = 0xFF0000;
        } else if (action === `Approved`) {
            color = 0x0000FF;
        }

        webhookClient.send({
            username: `BadBeatMods`,
            avatarURL: `${Config.server.url}/favicon.ico`,
            embeds: [
                {
                    title: `${action} Mod Version: ${mod.name} ${modVersion.modVersion.toString()}`,
                    url: `${Config.server.url}/api/modversion/${modVersion.id}`,
                    description: `${mod.description} `,
                    author: {
                        name: `${author.username} `,
                        icon_url: `https://github.com/${author.username}.png`,
                    },
                    fields: [
                        {
                            name: `Platform`,
                            value: `${modVersion.platform} `,
                        },
                        {
                            name: `# of Files`,
                            value: `${modVersion.contentHashes.length} `,
                        },
                        {
                            name: `Game Versions`,
                            value: `${gameVersions.join(`, `)} `,
                        },

                    ],
                    thumbnail: {
                        url: `${Config.server.url}/cdn/icon/${mod.iconFileName}`,
                    },
                    color: color,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: `Mod ID: ${mod.id}`,
                        icon_url: `${Config.server.url}/favicon.ico`,
                    },
                },
            ],
        });
    }
}