import * as cf from '../../storage/config.json';

// This is a simple config loader that reads from a JSON file and maps the values to a static class. It's a little excessive but this way the config is clearly communicated, and is available without a refrence to the file itself.
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
    database: {
        dialect: cf.database.dialect ? cf.database.dialect : `sqlite`,
        url: cf.database.url ? cf.database.url : `./storage/database.sqlite`,
        username: cf.database.username ? cf.database.username : `user`,
        password: cf.database.password ? cf.database.password : `password`,
        alter: cf.database.alter ? cf.database.alter : false,
    },
    storage: {
        modsDir :  cf.storage.modsDir ? cf.storage.modsDir : `./storage/uploads`,
        iconsDir : cf.storage.iconsDir ? cf.storage.iconsDir : `./storage/icons`
    },
    server: {
        port: cf.server.port ? cf.server.port : 5001,
        url: cf.server.url ? cf.server.url : `http://localhost:5001`,
        sessionSecret:  cf.server.sessionSecret ? cf.server.sessionSecret : `supersecretkey`
    },
    devmode: cf.devmode ? cf.devmode : false,
    authBypass: cf.authBypass ? cf.authBypass : false,
    webhooks: {
        enableWebhooks: cf.webhooks?.enableWebhooks ? cf.webhooks.enableWebhooks : true,
        enablePublicWebhook: cf.webhooks?.enablePublicWebhook ? cf.webhooks.enablePublicWebhook : false,
        loggingUrl: cf.webhooks?.loggingUrl ? cf.webhooks.loggingUrl : null,
        modLogUrl: cf.webhooks?.modLogUrl ? cf.webhooks.modLogUrl : null,
        publicUrl: cf.webhooks?.publicUrl ? cf.webhooks.publicUrl : null,
    },
    bot: {
        enabled: cf.bot.enabled || false,
        clientId: cf.bot.clientId,
        token: cf.bot.token,
    }
};

export class Config {
    public static readonly auth: {
        discord: AuthServiceConfig;
        github: AuthServiceConfig;
    } = configMapping.auth;
    public static readonly database: {
        dialect: string;
        url: string;
        username: string;
        password: string;
        alter: boolean;
    } = configMapping.database;
    public static readonly storage: {
        modsDir: string;
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
        enableWebhooks: boolean;
        enablePublicWebhook: boolean;
        loggingUrl: string;
        modLogUrl: string;
        publicUrl: string;
    } = configMapping.webhooks;
    public static readonly bot: {
        enabled: boolean;
        clientId: string;
        token: string;
    } = configMapping.bot;

    constructor() {
        console.log(Config);
        console.log(`Config loaded.`);
    }
}

interface AuthServiceConfig {
    clientId: string;
    clientSecret: string;
}