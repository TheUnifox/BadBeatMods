import path from "path";
import { exit } from "process";
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, ModelStatic, Op, Sequelize } from "sequelize";
import { storage, devmode } from '../../storage/config.json';
import { Logger } from "./Logger";

export class DatabaseManager {
    public sequelize: Sequelize;
    public Users: ModelStatic<User>;
    public ModVersions: ModelStatic<ModVersion>;
    public Mods: ModelStatic<Mod>;

    constructor() {
        this.sequelize = new Sequelize(`database`, `user`, `password`, {
            host: `localhost`,
            dialect: `sqlite`,
            logging: false,
            storage: path.resolve(storage.database),
        });

        Logger.log(`Loading Database...`);
        this.loadTables();
        this.sequelize.sync({
            alter: devmode,
        }).then(() => {
            Logger.log(`Database Loaded.`);
            new DatabaseHelper(this);

            let user = this.Users.findByPk(1);
            if (!user) {
                this.Users.create({
                    username: `TestUser`,
                    discordId: `1`,
                    roles: [`admin`],
                }).then(() => {
                    Logger.log(`Test user created.`);
                }).catch((error) => {
                    Logger.error(`Error creating test user: ${error}`);
                    exit(-1);
                });
            }

            DatabaseHelper.database.sequelize.query(`PRAGMA integrity_check;`).then((healthcheck) => {
                let healthcheckString = (healthcheck[0][0] as any).integrity_check;
                Logger.log(`Database health check: ${healthcheckString}`);
            }).catch((error) => {
                Logger.error(`Error checking database health: ${error}`);
            });
            setInterval(() => {
                DatabaseHelper.database.sequelize.query(`PRAGMA integrity_check;`).then((healthcheck) => {
                    let healthcheckString = (healthcheck[0][0] as any).integrity_check;
                    Logger.log(`Database health check: ${healthcheckString}`);
                }).catch((error) => {
                    Logger.error(`Error checking database health: ${error}`);
                });
            }, 1000 * 60 * 60 * 1);
        }).catch((error) => {
            Logger.error(`Error loading database: ${error}`);
            exit(-1);
        });
    }

    private loadTables() {
        this.Users = User.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            username: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            discordId: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            roles: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `[]`,
                get() {
                    // @ts-expect-error s(2345)
                    return JSON.parse(this.getDataValue(`roles`));
                },
                set(value: string[]) {
                    // @ts-expect-error s(2345)
                    this.setDataValue(`roles`, JSON.stringify(value));
                },
            },
            createdAt: DataTypes.DATE, // just so that typescript isn't angy
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this.sequelize,
            modelName: `users`,
        });

        this.Mods = Mod.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            authorId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            visibility: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `private`,
            },
            createdAt: DataTypes.DATE, // just so that typescript isn't angy
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this.sequelize,
            modelName: `mods`,
        });

        this.ModVersions = ModVersion.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            modId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            authorId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            modVersion: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            supportedGameVersions: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
                get() {
                    // @ts-expect-error s(2345)
                    return JSON.parse(this.getDataValue(`supportedGameVersions`));
                },
                set(value: string[]) {
                    // @ts-expect-error s(2345)
                    this.setDataValue(`supportedGameVersions`, JSON.stringify(value));
                },
            },
            visibility: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `private`,
            },
            platform: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `steam`,
            },
            zipHash: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            contentHashes: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `[]`,
                get() {
                    // @ts-expect-error s(2345)
                    return JSON.parse(this.getDataValue(`contentHashes`));
                },
                set(value: ContentHash[]) {
                    // @ts-expect-error s(2345)
                    this.setDataValue(`contentHashes`, JSON.stringify(value));
                },
            },
            dependancies: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
                get() {
                    // @ts-expect-error s(2345)
                    return JSON.parse(this.getDataValue(`dependancies`));
                },
                set(value: number[]) {
                    // @ts-expect-error s(2345)
                    this.setDataValue(`dependancies`, JSON.stringify(value));
                }
            },
            createdAt: DataTypes.DATE, // just so that typescript isn't angy
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this.sequelize,
            modelName: `modVersions`,
        });
    }

}

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare readonly id: CreationOptional<number>;
    declare username: string;
    declare discordId: string;
    declare roles: string[];
    declare readonly createdAt: CreationOptional<Date>;
    declare readonly updatedAt: CreationOptional<Date>;
}

export class Mod extends Model<InferAttributes<Mod>, InferCreationAttributes<Mod>> {
    declare readonly id: CreationOptional<number>;
    declare name: string;
    declare description: string;
    declare authorId: number;
    declare visibility: string;
    declare readonly createdAt: CreationOptional<Date>;
    declare readonly updatedAt: CreationOptional<Date>;
}

export class ModVersion extends Model<InferAttributes<ModVersion>, InferCreationAttributes<ModVersion>> {
    declare readonly id: number;
    declare modId: number;
    declare authorId: number;
    declare modVersion: string;
    declare supportedGameVersions: string[];
    declare visibility: ModVisibility;
    declare dependancies: number[]; // array of modVersion ids
    declare platform: Platform;
    declare zipHash: string;
    declare contentHashes: ContentHash[];
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

export interface ContentHash {
    path: string;
    hash: string;
}

export enum Platform {
    Steam = `steampc`,
    Oculus = `oculuspc`,
    Universal = `universalpc`,
}

export enum ModVisibility {
    Private = `private`,
    Unverified = `unverified`,
    Public = `public`,
}

export function isValidPlatform(value: string): value is Platform {
    return validateEnumValue(value, Platform);
}

export function isValidVisibility(value: string): value is ModVisibility {
    return validateEnumValue(value, ModVisibility);
}

// yoink thankies bstoday & bns
function validateEnumValue(value: string | number, enumType: object): boolean {
    if (Object.values(enumType).includes(value)) {
        return true;
    }
    return false;
}

export class DatabaseHelper {
    public static database: DatabaseManager;

    constructor(database: DatabaseManager) {
        DatabaseHelper.database = database;
    }
}