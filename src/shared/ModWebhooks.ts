import { APIMessage, Embed, EmbedBuilder, MessagePayload, WebhookClient, WebhookMessageCreateOptions } from "discord.js";
import { DatabaseHelper, EditQueue, Mod, ModApproval, ModVersion, ModVersionApproval, Status, User } from "./Database";
import { Config } from "./Config";
import { Logger } from "./Logger";
import { send } from "node:process";

let webhookClient1: WebhookClient;
let webhookClient2: WebhookClient;

async function sendToWebhooks(options: string | MessagePayload | WebhookMessageCreateOptions) {
    let retVal:Promise<APIMessage>[] = [];
    if (Config.webhooks.enableWebhooks) {
        if (!webhookClient1 && Config.webhooks.modLogUrl.length > 8) {
            webhookClient1 = new WebhookClient({ url: Config.webhooks.modLogUrl });
        }

        if (!webhookClient2 && Config.webhooks.modLog2Url.length > 8) {
            webhookClient2 = new WebhookClient({ url: Config.webhooks.modLog2Url });
        }
        if (webhookClient1) {
            retVal.push(webhookClient1.send(options));
        }

        if (webhookClient2) {
            retVal.push(webhookClient2.send(options));
        }
    }

    return Promise.all(retVal);
}

async function sendEmbedToWebhooks(embed: EmbedBuilder) {
    let faviconUrl = Config.flags.enableFavicon ? `${Config.server.url}/favicon.ico` : `https://raw.githubusercontent.com/Saeraphinx/BadBeatMods/refs/heads/main/assets/favicon.png`;
    sendToWebhooks({ 
        username: `BadBeatMods`,
        avatarURL: faviconUrl,
        embeds: [embed]
    });
}

export async function sendModLog(mod: Mod, userMakingChanges:User, action: `New` | `Approved` | `Rejected`) {
    const faviconUrl = Config.flags.enableFavicon ? `${Config.server.url}/favicon.ico` : `https://raw.githubusercontent.com/Saeraphinx/BadBeatMods/refs/heads/main/assets/favicon.png`;
    let authors:User[] = [];
    for (let author of mod.authorIds) {
        let authorDb = await DatabaseHelper.database.Users.findOne({ where: { id: author } });
        if (!authorDb) {
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

    let whData = {
        username: `BadBeatMods`,
        avatarURL: faviconUrl,
        embeds: [
            {
                title: `${action} Mod: ${mod.name}`,
                url: `${Config.server.url}/mods/${mod.id}`,
                description: `${mod.description} `,
                author: {
                    name: `${userMakingChanges.username} `,
                    icon_url: userMakingChanges.username === `ServerAdmin` ? faviconUrl : `https://github.com/${userMakingChanges.username}.png`,
                },
                fields: [
                    {
                        name: `Authors`,
                        value: `${authors.map(author => { return author.username; }).join(`, `)} `,
                        inline: true,
                    },
                    {
                        name: `Category`,
                        value: `${mod.category} `,
                        inline: true,
                    },
                    {
                        name: `Git URL`,
                        value: `${mod.gitUrl} `,
                        inline: false,
                    },
                        
                ],
                thumbnail: {
                    url: `${Config.server.url}/cdn/icon/${mod.iconFileName}`,
                },
                color: color,
                timestamp: new Date().toISOString(),
                footer: {
                    text: `Mod ID: ${mod.id}`,
                    icon_url: faviconUrl,
                },
            },
        ],
    };

    sendToWebhooks(whData);
}

export async function sendModVersionLog(modVersion: ModVersion, userMakingChanges:User, action: `New` | `Approved` | `Rejected`, modObj?:Mod) {
    let author = await DatabaseHelper.database.Users.findOne({ where: { id: modVersion.authorId } });
    let mod = modObj ? modObj : await DatabaseHelper.database.Mods.findOne({ where: { id: modVersion.modId } });
    let gameVersions = await modVersion.getSupportedGameVersions();
    let dependancies: string[] = [];
    let resolvedDependancies = await modVersion.getUpdatedDependencies(gameVersions[0].id, [Status.Verified, Status.Unverified]);

    if (!author) {
        return Logger.error(`Author not found for mod version ${modVersion.id}`);
    }

    if (!mod) {
        return Logger.error(`Mod not found for mod version ${modVersion.id}`);
    }

    if (!resolvedDependancies) {
        return Logger.error(`Dependancies not found for mod version ${modVersion.id}`);
    }

    for (let dependancy of resolvedDependancies) {
        let dependancyMod = await DatabaseHelper.database.Mods.findOne({ where: { id: dependancy.modId } });
        if (!dependancyMod) {
            return Logger.warn(`Dependancy mod ${dependancy.modId} not found for mod version ${modVersion.id}`);
        }
        dependancies.push(`${dependancyMod.name} v${dependancy.modVersion.raw}`);
    }
        

    let color = 0x00FF00;

    if (action === `Rejected`) {
        color = 0xFF0000;
    } else if (action === `Approved`) {
        color = 0x0000FF;
    }

    sendToWebhooks({
        username: `BadBeatMods`,
        avatarURL: `${Config.server.url}/favicon.ico`,
        embeds: [
            {
                title: `${action} Mod Version: ${mod.name} v${modVersion.modVersion.raw}`,
                url: `${Config.server.url}/mods/${mod.id}`,
                description: `${mod.description} `,
                author: {
                    name: `${userMakingChanges.username} `,
                    icon_url: userMakingChanges.username === `ServerAdmin` ? `${Config.server.url}/favicon.ico` : `https://github.com/${userMakingChanges.username}.png`,
                },
                fields: [
                    {
                        name: `Author`,
                        value: `${author.username} `,
                        inline: true,
                    },
                    {
                        name: `Platform`,
                        value: `${modVersion.platform} `,
                        inline: true,
                    },
                    {
                        name: `# of Files`,
                        value: `${modVersion.contentHashes.length} `,
                        inline: true,
                    },
                    {
                        name: `Game Versions`,
                        value: `${gameVersions.map((v) => v.version).join(`, `)} `,
                        inline: true,
                    },
                    {
                        name: `Dependencies`,
                        value: `${dependancies.join(`, `)} `,
                        inline: true,
                    },
                ],
                thumbnail: {
                    url: `${Config.server.url}/cdn/icon/${mod.iconFileName}`,
                },
                color: color,
                timestamp: new Date().toISOString(),
                footer: {
                    text: `Mod ID: ${mod.id} | Mod Version ID: ${modVersion.id}`,
                    icon_url: `${Config.server.url}/favicon.ico`,
                },
            },
        ],
    });
}

export async function sendEditLog(edit:EditQueue, userMakingChanges:User, action: `New` | `Approved` | `Rejected`) {
    const faviconUrl = Config.flags.enableFavicon ? `${Config.server.url}/favicon.ico` : `https://raw.githubusercontent.com/Saeraphinx/BadBeatMods/refs/heads/main/assets/favicon.png`;
    let color = 0x00FF00;

    if (action === `Rejected`) {
        color = 0xFF0000;
    } else if (action === `New`) {
        color = 0x0000FF;
    }

    let modId = edit.objectTableName === `mods` ? edit.objectId : null;
    if (!modId) {
        let modVersion = DatabaseHelper.cache.modVersions.find((modVersion) => modVersion.id === edit.objectId);
        if (!modVersion) {
            return Logger.error(`Mod version not found for edit ${edit.id}`);
        }
        modId = modVersion.modId;
    }

    let mod = DatabaseHelper.cache.mods.find((mod) => mod.id === modId);
    if (!mod) {
        return Logger.error(`Mod not found for edit ${edit.id}`);
    }

    let embed = new EmbedBuilder();
    embed.setColor(color);
    embed.setTimestamp(new Date(Date.now()));
    embed.setAuthor({
        name: userMakingChanges.username,
        iconURL: userMakingChanges.username === `ServerAdmin` ? faviconUrl : `https://github.com/${userMakingChanges.username}.png`
    });
    embed.setFooter({
        text: `Mod ID: ${mod.id} | Edit ID: ${edit.id}`,
        iconURL: faviconUrl,
    });
    embed.setTitle(`${action} Edit: ${mod.name}`);
    embed.setURL(`${Config.server.url}/mods/${mod.id}`);
    let original = edit.objectTableName === `mods` ? mod : DatabaseHelper.cache.modVersions.find((modVersion) => modVersion.id === edit.objectId);
    if (!original) {
        return Logger.error(`Original not found for edit ${edit.id}`);
    }

    let description = ``;

    if (edit.isMod() && `name` in original) {
        for (let key of Object.keys(edit.object) as (keyof ModApproval)[]) {
            if (edit.object[key] != original[key]) {
                if (key === `description`) {
                    description += `**${key}**: ${(original[key] as string).substring(0, 100)} -> ${(edit.object[key] as string).substring(0, 100)}\n`;
                    continue;
                }
                description += `**${key}**: ${original[key]} -> ${edit.object[key]}\n`;
            }
        }
    } else if (edit.isModVersion() && `platform` in original) {
        for (let key of Object.keys(edit.object) as (keyof ModVersionApproval)[]) {
            if (edit.object[key] != original[key]) {
                description += `**${key}**: ${original[key]} -> ${edit.object[key]}\n`;
            }
        }
    }

    if (description.length > 4096) {
        description = description.substring(0, 4096);
    }

    embed.setDescription(description);

    sendEmbedToWebhooks(embed);
}