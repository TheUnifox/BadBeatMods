import * as cf from '../../storage/config.json';

// This is a simple config loader that reads from a JSON file and maps the values to a static class. It's a little excessive but this way the config is clearly communicated.
const configMapping = {
    auth: {
        discord: {
            clientId: cf.auth.discord.clientId,
            clientSecret: cf.auth.discord.clientSecret,
        },
        github: {
            clientId: cf.auth?.github?.clientId,
            clientSecret: cf.auth?.github?.clientSecret,
        }
    },
    storage: {
        database : cf.storage.database ? cf.storage.database : `./storage/database.sqlite`,
        uploadsDir :  cf.storage.uploadsDir ? cf.storage.uploadsDir : `./storage/uploads`,
        iconsDir : cf.storage.iconsDir ? cf.storage.iconsDir : `./storage/icons`
    },
    server: {
        port: cf.server.port ? cf.server.port : 3000,
        url: cf.server.url ? cf.server.url : `http://localhost:3000`,
        sessionSecret:  cf.server.sessionSecret ? cf.server.sessionSecret : `supersecretkey`
    },
    devmode: cf.devmode ? cf.devmode : false,
    authBypass: cf.authBypass ? cf.authBypass : false,
    webhooks: {
        disableWebhooks: cf.webhooks?.disableWebhooks ? cf.webhooks.disableWebhooks : false,
        loggingUrl: cf.webhooks?.loggingUrl ? cf.webhooks.loggingUrl : null,
        modLogUrl: cf.webhooks?.modLogUrl ? cf.webhooks.modLogUrl : null,
    },
    bot: {
        clientId: cf.bot.clientId,
        token: cf.bot.token,
    }
};

export class Config {
    public static readonly auth: {
        discord: AuthServiceConfig;
        github: AuthServiceConfig;
    } = configMapping.auth;
    public static readonly storage: {
        database: string;
        uploadsDir: string;
        iconsDir: string;
    } = configMapping.storage;
    public static readonly server: {
        port: number;
        url: string;
        sessionSecret: string;
    } = configMapping.server;
    public static readonly devmode: boolean = configMapping.devmode;
    public static readonly authBypass: boolean = configMapping.authBypass;
    public static readonly webhooks: {
        disableWebhooks: boolean;
        loggingUrl: string;
        modLogUrl: string;
    } = configMapping.webhooks;
    public static readonly bot: {
        clientId: string;
        token: string;
    } = configMapping.bot;

    constructor() {
        console.log(`Config loaded.`);
    }
}

interface AuthServiceConfig {
    clientId: string;
    clientSecret: string;
}