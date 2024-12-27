import { randomInt } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// This is a simple config loader that reads from a JSON file and maps the values to a static class. It's a little excessive but this way the config is clearly communicated, and is available without a refrence to the file itself.
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
        username: `user`,
        password: `password`,
        alter: false
    },
    storage: {
        modsDir: `./storage/uploads`,
        iconsDir: `./storage/icons`
    },
    devmode: false,
    authBypass: false,
    server: {
        port: 5001,
        url: `http://localhost:5001`,
        sessionSecret: `supersecret`,
        iHateSecurity: false,
        corsOrigins: `*`
    },
    webhooks: {
        enableWebhooks: false,
        enablePublicWebhook: true,
        loggingUrl: `http://localhost:5001/webhooks/logging`,
        modLogUrl: `http://localhost:5001/webhooks/modlog`,
        publicUrl: `http://localhost:5001/webhooks/public`
    },
    bot: {
        enabled: false,
        clientId: `BOT_CLIENT_ID`,
        token: `BOT_TOKEN`
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
                let generateedId = randomInt(100000, 999999);
                if (fs.existsSync(path.resolve(`./storage/config.json-${generateedId}.bak`))) {
                    generateedId = randomInt(100000, 999999);
                    if (fs.existsSync(path.resolve(`./storage/config.json-${generateedId}.bak`))) {
                        fs.unlinkSync(path.resolve(`./storage/config.json-${generateedId}.bak`));
                    }
                }
                fs.renameSync(path.resolve(`./storage/config.json`), path.resolve(`./storage/config.json-${generateedId}.bak`));
                console.warn(`Config file was invalid. A new one has been created. The old one has been backed up.`);
                fs.writeFileSync(path.resolve(`./storage/config.json`), JSON.stringify(DEFAULT_CONFIG, null, 2));
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
                if (`auth` in cf) {
                    if (!doKeysMatch(cf.auth, Object.keys(DEFAULT_CONFIG.auth))) {
                        failedToLoad.push(`auth`);
                    } else {
                        Config._auth = cf.auth;
                    }
                } else {
                    failedToLoad.push(`auth`);
                }

                if (`database` in cf) {
                    if (!doKeysMatch(cf.database, Object.keys(DEFAULT_CONFIG.database))) {
                        failedToLoad.push(`database`);
                    } else {
                        Config._database = cf.database;
                    }
                } else {
                    failedToLoad.push(`database`);
                }

                if (`storage` in cf) {
                    if (!doKeysMatch(cf.storage, Object.keys(DEFAULT_CONFIG.storage))) {
                        failedToLoad.push(`storage`);
                    } else {
                        Config._storage = cf.storage;
                    }
                } else {
                    failedToLoad.push(`storage`);
                }

                if (`server` in cf) {
                    if (!doKeysMatch(cf.server, Object.keys(DEFAULT_CONFIG.server))) {
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
                    if (!doKeysMatch(cf.webhooks, Object.keys(DEFAULT_CONFIG.webhooks))) {
                        failedToLoad.push(`webhooks`);
                    } else {
                        Config._webhooks = cf.webhooks;
                    }
                } else {
                    failedToLoad.push(`webhooks`);
                }

                if (`bot` in cf) {
                    if (!doKeysMatch(cf.bot, Object.keys(DEFAULT_CONFIG.bot))) {
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
}

function doKeysMatch(obj: any, keys: string[]): boolean {
    let objKeys = Object.keys(obj);
    for (let key of keys) {
        if (!objKeys.includes(key)) {
            return false;
        }
    }
    return true;
}

interface AuthServiceConfig {
    clientId: string;
    clientSecret: string;
}