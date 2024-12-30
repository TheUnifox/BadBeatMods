import * as fs from 'fs';
import * as path from 'path';

// This is a simple config loader that reads from a JSON file and maps the values to a static class. It's a little excessive but this way the config is clearly communicated, and is available without a refrence to the file itself.
// To add a config option, add it to the DEFAULT_CONFIG object, and add a property to the Config class with the same name. The Config class will automatically load the config from the file and map it to the static properties.
const DEFAULT_CONFIG = {
    auth: {
        discord: {
            clientId: `DISCORD_CLIENT_ID`,
            clientSecret: `DISCORD_CLIENT_SECRET`
        },
        github: {
            clientId: `GITHUB_CLIENT_ID`,
            clientSecret: `GITHUB_CLIENT_SECRET`
        },
        permittedRedirectDomains: [`http://localhost:5173`, `http://localhost:4173`, `http://localhost:5001`, `http://localhost:3000`]
    },
    database: {
        dialect: `sqlite`,
        url: `./storage/database.sqlite`,
        port: 5432, // only used for postgres
        username: `user`,
        password: `password`,
        alter: false
    },
    storage: {
        modsDir: `./storage/uploads`,
        iconsDir: `./storage/icons`
    },
    devmode: false, // enables devmode features + increased logging
    authBypass: false, // bypasses auth for all routes. uses ServerAdmin user.
    server: {
        port: 5001,
        url: `http://localhost:5001`, // base url of the api wihtout the trailing slash or /api part. used for internal testing & swagger docs
        sessionSecret: `supersecret`,
        iHateSecurity: false, //sets cookies to insecure & allows cors auth from all origins listed in corsOrigins (cannot be a wildcard)
        corsOrigins: `*` //can be a string or an array of strings
    },
    webhooks: {
        enableWebhooks: false, // enables sending to all webhooks
        enablePublicWebhook: true, // enables sending approved mods to the public webhook
        loggingUrl: `http://localhost:5001/webhooks/logging`, // url for logging - sensitive data might be sent here
        modLogUrl: `http://localhost:5001/webhooks/modlog`, // url for mod logging - new, approvals, and rejections
        publicUrl: `http://localhost:5001/webhooks/public` // url for public webhook - approved mods only... might have a delay? hasn't been done yet.
    },
    bot: {
        enabled: false,
        clientId: `BOT_CLIENT_ID`,
        token: `BOT_TOKEN`
    },
    flags: {
        enableBeatModsDownloads: true, // enables downloading mods from BeatMods
        logRawSQL: false, // logs raw SQL queries to the console
        enableFavicon: true, // enables the favicon route /favicon.ico
        enableBanner: true, // enables the banner route /banner.png
        enableSwagger: true, // enables the swagger docs at /api/docs
        enableDBHealthCheck: true, // enables the database health check at /api/health
    }
};


export class Config {
    // #region Private Static Properties
    private static _auth: {
        discord: AuthServiceConfig;
        github: AuthServiceConfig;
        permittedRedirectDomains: string[];
    };
    private static _database: {
        dialect: string;
        url: string;
        port: number;
        username: string;
        password: string;
        alter: boolean;
    };
    private static _storage: {
        modsDir: string;
        iconsDir: string;
    };
    private static _server: {
        port: number;
        url: string;
        sessionSecret: string;
        iHateSecurity: boolean;
        corsOrigins: string | string[];
    };
    private static _devmode: boolean = DEFAULT_CONFIG.devmode;
    private static _authBypass: boolean = DEFAULT_CONFIG.authBypass;
    private static _webhooks: {
        enableWebhooks: boolean;
        enablePublicWebhook: boolean;
        loggingUrl: string;
        modLogUrl: string;
        publicUrl: string;
    };
    private static _bot: {
        enabled: boolean;
        clientId: string;
        token: string;
    };
    private static _flags: {
        enableBeatModsDownloads: boolean;
        logRawSQL: boolean;
        enableFavicon: boolean;
        enableBanner: boolean;
        enableSwagger: boolean;
        enableDBHealthCheck: boolean;
    };
    // #endregion
    // #region Public Static Properties
    public static get auth() {
        return this._auth;
    }
    public static get database() {
        return this._database;
    }
    public static get storage() {
        return this._storage;
    }
    public static get server() {
        return this._server;
    }
    public static get devmode() {
        return this._devmode;
    }
    public static get authBypass() {
        return this._authBypass;
    }
    public static get webhooks() {
        return this._webhooks;
    }
    public static get bot() {
        return this._bot;
    }
    public static get flags() {
        return this._flags;
    }
    // #endregion
    constructor() {
        let success = Config.loadConfig();
        if (success.length > 0) {
            console.error(`Config file is invalid at keys ${success.join(`, `)}. Attempting to load default config.`);
            if (!fs.existsSync(path.resolve(`./storage`))) {
                fs.mkdirSync(path.resolve(`./storage`));
            }

            if (fs.existsSync(path.resolve(`./storage/config.json`))) {
                console.log(`Backing up existing config file...`);
                let generateedId = new Date().getTime();
                if (fs.existsSync(path.resolve(`./storage/config.json-${generateedId}.bak`))) {
                    fs.unlinkSync(path.resolve(`./storage/config.json-${generateedId}.bak`));
                }
                fs.renameSync(path.resolve(`./storage/config.json`), path.resolve(`./storage/config.json-${generateedId}.bak`));
                console.warn(`Config file was invalid. A merge will be attempted. The old config has been backed up.`);
                let mergeResults = Config.mergeConfig(path.resolve(`./storage/config.json-${generateedId}.bak`));
                if (!mergeResults) {
                    console.error(`Errors occurred while merging the config file. Please check the config file and try again.`);
                    process.exit(1);
                }
            } else {
                console.warn(`Config file not found. A new one has been created.`);
                fs.writeFileSync(path.resolve(`./storage/config.json`), JSON.stringify(DEFAULT_CONFIG, null, 2));
            }

            let successpart2 = Config.loadConfig();
            if (successpart2.length > 0) {
                console.error(`Config file is invalid at keys ${success.join(`, `)}. Please check the config file and try again.`);
                process.exit(1);
            }
        }

        if (!fs.existsSync(path.resolve(Config.storage.modsDir))) {
            console.log(`Creating mods directory at ${path.resolve(Config.storage.modsDir)}`);
            fs.mkdirSync(path.resolve(Config.storage.modsDir));
        }

        if (!fs.existsSync(path.resolve(Config.storage.iconsDir))) {
            console.log(`Creating icons directory at ${path.resolve(Config.storage.iconsDir)}`);
            fs.mkdirSync(path.resolve(Config.storage.iconsDir));
        }
    }

    private static loadConfig() {
        console.log(`Loading config file from ${path.resolve(`./storage/config.json`)}`);
        if (fs.existsSync(path.resolve(`./storage/config.json`))) {
            let file = fs.readFileSync(path.resolve(`./storage/config.json`), `utf8`);
            let cf = JSON.parse(file);
            let failedToLoad: string[] = [];
            try {
                if (`flags` in cf) {
                    if (!doObjKeysMatch(cf.flags, DEFAULT_CONFIG.flags)) {
                        failedToLoad.push(`flags`);
                    } else {
                        Config._flags = cf.flags;
                    }
                } else {
                    failedToLoad.push(`auth`);
                }

                if (`auth` in cf) {
                    if (!doObjKeysMatch(cf.auth, DEFAULT_CONFIG.auth)) {
                        failedToLoad.push(`auth`);
                    } else {
                        Config._auth = cf.auth;
                    }
                } else {
                    failedToLoad.push(`auth`);
                }

                if (`database` in cf) {
                    if (!doObjKeysMatch(cf.database, DEFAULT_CONFIG.database)) {
                        failedToLoad.push(`database`);
                    } else {
                        Config._database = cf.database;
                    }
                } else {
                    failedToLoad.push(`database`);
                }

                if (`storage` in cf) {
                    if (!doObjKeysMatch(cf.storage, DEFAULT_CONFIG.storage)) {
                        failedToLoad.push(`storage`);
                    } else {
                        Config._storage = cf.storage;
                    }
                } else {
                    failedToLoad.push(`storage`);
                }

                if (`server` in cf) {
                    if (!doObjKeysMatch(cf.server, DEFAULT_CONFIG.server)) {
                        failedToLoad.push(`server`);
                    } else {
                        Config._server = cf.server;
                    }
                } else {
                    failedToLoad.push(`server`);
                }

                //is a boolean
                if (`devmode` in cf) {
                    Config._devmode = cf.devmode;
                } else {
                    failedToLoad.push(`devmode`);
                }

                //is a boolean
                if (`authBypass` in cf) {
                    Config._authBypass = cf.authBypass;
                } else {
                    failedToLoad.push(`authBypass`);
                }

                if (`webhooks` in cf) {
                    if (!doObjKeysMatch(cf.webhooks, DEFAULT_CONFIG.webhooks)) {
                        failedToLoad.push(`webhooks`);
                    } else {
                        Config._webhooks = cf.webhooks;
                    }
                } else {
                    failedToLoad.push(`webhooks`);
                }

                if (`bot` in cf) {
                    if (!doObjKeysMatch(cf.bot, DEFAULT_CONFIG.bot)) {
                        failedToLoad.push(`bot`);
                    } else {
                        Config._bot = cf.bot;
                    }
                } else {
                    failedToLoad.push(`bot`);
                }
                return failedToLoad;
            } catch (e) {
                console.error(`Error parsing config file: ${e}`);
                return [`all`];
            }
        } else {
            console.warn(`Config file not found.`);
            return [`all`];
        }
    }

    private static mergeConfig(configPath: string = `./storage/config.json`): boolean {
        let cf = JSON.parse(fs.readFileSync(path.resolve(configPath), `utf8`)) as any;
        try {
            for (let defaultKey of Object.keys(DEFAULT_CONFIG)) {
                // @ts-expect-error 7053
                let subObj = DEFAULT_CONFIG[defaultKey];
                if (typeof subObj === `object` && Array.isArray(subObj) === false) {
                    for (let subkey of Object.keys(subObj)) {
                        if (typeof subObj[subkey] === `object` && Array.isArray(subObj[subkey]) === false) {
                            for (let subkey2 of Object.keys(subObj[subkey])) {
                                if (cf[defaultKey][subkey][subkey2] === undefined || cf[defaultKey][subkey][subkey2] === null) {
                                    cf[defaultKey][subkey][subkey2] = subObj[subkey][subkey2];
                                }
                            }
                        } else {
                            if (cf[defaultKey][subkey] === undefined) {
                                cf[defaultKey][subkey] = subObj[subkey];
                            }
                        }
                    }
                } else {
                    if (cf[defaultKey] === undefined) {
                        cf[defaultKey] = subObj;
                    }
                }
            }
        } catch (e) {
            console.error(`Error merging config file: ${e}`);
            return false;
        }

        try {
            fs.writeFileSync(path.resolve(`./storage/config.json`), JSON.stringify(cf, null, 2));
        } catch (e) {
            console.error(`Error writing config file: ${e}`);
            return false;
        }

        return true;
    }
}

function doObjKeysMatch(obj1: any, obj2: any): boolean {
    for (let key of Object.keys(obj1)) {
        if (typeof obj1[key] === `object` && Array.isArray(obj1[key]) === false) {
            let subkeys = doObjKeysMatch(obj1[key], obj2[key]);
            if (!subkeys) {
                return false;
            }
        } else {
            if (!Object.keys(obj2).includes(key)) {
                return false;
            }
        }
    }

    for (let key of Object.keys(obj2)) {
        if (typeof obj2[key] === `object` && Array.isArray(obj1[key]) === false) {
            let subkeys = doObjKeysMatch(obj2[key], obj1[key]);
            if (!subkeys) {
                return false;
            }
        } else {
            if (!Object.keys(obj1).includes(key)) {
                return false;
            }
        }
    }
    return true;
}

interface AuthServiceConfig {
    clientId: string;
    clientSecret: string;
}