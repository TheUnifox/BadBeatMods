import { Config } from "../shared/Config";
import * as Winston from "winston";
import { DiscordTransport } from "winston-transport-discord";

export class Logger {
    public static winston: Winston.Logger;

    constructor() {
        Logger.init();
    }

    public static init() {
        let transports: Winston.transport[] = [];
        if (Config.webhooks.enableWebhooks && Config.webhooks.loggingUrl.length > 8) {
            transports.push(new DiscordTransport({
                level: `info`,
                discord: {
                    webhook: {
                        url: Config.webhooks.loggingUrl,
                    },
                },
            }));
        }

        transports.push(new Winston.transports.Console({
            forceConsole: true,
            level: Config.devmode ? `http` : `consoleInfo`,
            consoleWarnLevels: [`consoleWarn`, `warn`, `error`, `debugWarn`],
            format: Winston.format.combine(
                Winston.format.timestamp({ format: `MM/DD/YY HH:mm:ss` }),
                Winston.format.printf(({ timestamp, level, message }) => {
                    return `[BBM ${level.toUpperCase()}] ${timestamp} > ${message}`;
                })
            )
        }));
        transports.push(new Winston.transports.File({
            filename: `storage/logs/${new Date(Date.now()).toLocaleDateString(`en-US`, { year: `numeric`, month: `numeric`, day: `numeric`}).replaceAll(`/`, `-`)}.log`,
            zippedArchive: true,
            maxsize: 20 * 1024 * 1024,
            maxFiles: 30,
            level: Config.devmode ? `debug` : `info`,
            format: Winston.format.combine(
                Winston.format.timestamp({ format: `MM-DD-YY HH:mm:ss` }),
                Winston.format.printf(({ timestamp, level, message }) => {
                    return `[${level.toUpperCase()}] ${timestamp} > ${message}`;
                })
            )
        }));

        this.winston = Winston.createLogger({
            level: `info`,
            levels: {
                error: 0,
                warn: 1,
                info: 2,
                consoleWarn: 3,
                consoleInfo: 4,
                debugWarn: 5,
                debug: 6,
                http: 7,
            },
            transports: transports,
        });

        Logger.log(`Logger initialized.`);
    }

    public static debug(message: any, category:string = ``) {
        Logger.winston.log(`debug`, message);
    }

    public static debugWarn(message: any, category:string = ``) {
        Logger.winston.log(`debugWarn`, message);
    }

    public static log(message: any, category:string = ``, consoleOnly: boolean = false) {
        Logger.winston.log(consoleOnly ? `consoleInfo` : `info`, message);
    }

    public static warn(message: any, category:string = ``, consoleOnly: boolean = false) {
        Logger.winston.log(consoleOnly ? `consoleWarn` : `warn`, message);
    }

    public static error(message: any, category:string = ``) {
        Logger.winston.log(`error`, message);
    }

    //compatibility
    public static info(message: any, category:string = ``, consoleOnly: boolean = false) {
        Logger.log(message, category, consoleOnly);
    }

    public info(message: any, category:string = ``, consoleOnly: boolean = false) {
        Logger.info(message, category, consoleOnly);
    }

    public log(message: any, category:string = ``, consoleOnly: boolean = false) {
        Logger.log(message, category, consoleOnly);
    }

    public warn(message: any, category:string = ``, consoleOnly: boolean = false) {
        Logger.warn(message, category, consoleOnly);
    }

    public error(message: any, category:string = ``) {
        Logger.error(message, category);
    }

    public debug(message: any, category:string = ``) {
        Logger.debug(message, category);
    }

    public debugWarn(message: any, category:string = ``) {
        Logger.debugWarn(message, category);
    }
}