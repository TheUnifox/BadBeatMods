import path from "path";
import { exit } from "process";
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, ModelStatic, Sequelize } from "sequelize";
import { Logger } from "./Logger";
import { satisfies, SemVer } from "semver";
import { Config } from "./Config";

function isValidDialect(dialect: string): dialect is `sqlite` |`postgres` {
    return [`sqlite`, `postgres`].includes(dialect);
}

export class DatabaseManager {
    public sequelize: Sequelize;
    public Users: ModelStatic<User>;
    public ModVersions: ModelStatic<ModVersion>;
    public Mods: ModelStatic<Mod>;
    public GameVersions: ModelStatic<GameVersion>;
    public EditApprovalQueue: ModelStatic<EditApprovalQueue>;

    constructor() {
        Logger.log(`Loading Database...`);
        this.sequelize = new Sequelize(`bbm_database`, Config.database.username, Config.database.password, {
            host: Config.database.dialect === `sqlite` ? `localhost` : Config.database.url,
            dialect: isValidDialect(Config.database.dialect) ? Config.database.dialect : `sqlite`,
            logging: false,
            storage: Config.database.dialect === `sqlite` ? path.resolve(Config.database.url) : undefined,
        });

        this.loadTables();
        this.sequelize.sync({
            alter: false,
        }).then(() => {
            Logger.log(`Database Loaded.`);
            new DatabaseHelper(this);

            this.Users.findByPk(1).then((user) => {
                if (!user) {
                    this.Users.create({
                        username: `ServerAdmin`,
                        discordId: `1`,
                        roles: [`admin`],
                        githubId: null,
                    }).then(() => {
                        Logger.log(`Created built in server account.`);
                    }).catch((error) => {
                        Logger.error(`Error creating built in server account: ${error}`);
                    });
                } else {
                    if (!user.roles.includes(`admin`)) {
                        if (user.username != `ServerAdmin`) {
                            Logger.warn(`Server account has been tampered with!`);
                        } else {
                            user.roles.push(`admin`);
                            user.save();
                            Logger.log(`Added admin role to server account.`);
                        }
                    }
                }
            });

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
                unique: true,
            },
            username: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            githubId: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: ``,
                unique: true, //SQLite treats all NULL values are different, therefore, a column with a UNIQUE constraint can have multiple NULL values.
            },
            avatarUrl: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: `https://github.com/identicons/octocat.png`,
            },
            sponsorUrl: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: ``,
            },
            discordId: {
                type: DataTypes.STRING,
                allowNull: true,
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

        this.GameVersions = GameVersion.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                unique: true,
            },
            gameName: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            version: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            createdAt: DataTypes.DATE, // just so that typescript isn't angy
            updatedAt: DataTypes.DATE,
        }, {
            sequelize: this.sequelize,
            modelName: `gameVersions`,
        });

        this.Mods = Mod.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                unique: true,
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
            category: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `other`,
            },
            authorIds: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `[]`,
                get() {
                    // @ts-expect-error s(2345)
                    return JSON.parse(this.getDataValue(`authorIds`));
                },
                set(value: number[]) {
                    // @ts-expect-error s(2345)
                    this.setDataValue(`authorIds`, JSON.stringify(value));
                },
            },
            iconFileName: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
            },
            gitUrl: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
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
                unique: true,
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
                get() {
                    return new SemVer(this.getDataValue(`modVersion`));
                },
                set(value: SemVer) {
                    // @ts-expect-error ts(2345)
                    this.setDataValue(`modVersion`, value.raw);
                },
            },
            supportedGameVersionIds: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: ``,
                get() {
                    // @ts-expect-error s(2345)
                    return JSON.parse(this.getDataValue(`supportedGameVersionIds`));
                },
                set(value: number[]) {
                    // @ts-expect-error s(2345)
                    this.setDataValue(`supportedGameVersionIds`, JSON.stringify(value));
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
            dependencies: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: `[]`,
                get() {
                    // @ts-expect-error s(2345)
                    return JSON.parse(this.getDataValue(`dependencies`));
                },
                set(value: number[]) {
                    // @ts-expect-error s(2345)
                    this.setDataValue(`dependencies`, JSON.stringify(value));
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
    declare githubId: string;
    declare discordId: string;
    declare avatarUrl: string;
    declare sponsorUrl: string;
    declare roles: string[];
    declare readonly createdAt: CreationOptional<Date>;
    declare readonly updatedAt: CreationOptional<Date>;
}

export enum UserRoles {
    Admin = `admin`,
    Approver = `approver`,
    Moderator = `moderator`,
    Banned = `banned`,
}

export class GameVersion extends Model<InferAttributes<GameVersion>, InferCreationAttributes<GameVersion>> {
    declare readonly id: CreationOptional<number>;
    declare gameName: string;
    declare version: string; // semver-esc version (e.g. 1.29.1)
    declare readonly createdAt: CreationOptional<Date>;
    declare readonly updatedAt: CreationOptional<Date>;
}

export class Mod extends Model<InferAttributes<Mod>, InferCreationAttributes<Mod>> {
    declare readonly id: CreationOptional<number>;
    declare name: string;
    declare description: string;
    declare category: Categories;
    declare authorIds: number[];
    declare visibility: Visibility;
    declare iconFileName: string;
    declare gitUrl: string;
    declare readonly createdAt: CreationOptional<Date>;
    declare readonly updatedAt: CreationOptional<Date>;

    public async getLatestVersion(gameVersion: number): Promise<ModVersion | null> {
        let versions = await DatabaseHelper.database.ModVersions.findAll({ where: { modId: this.id } });
        let latestVersion: ModVersion | null = null;
        for (let version of versions) {
            if (version.supportedGameVersionIds.includes(gameVersion)) {
                if (!latestVersion || version.modVersion.compare(latestVersion.modVersion) > 0) {
                    latestVersion = version;
                }
            }
        }
        return latestVersion;
    }

    public async setVisibility(visibility:Visibility, user: User) {
        this.visibility = visibility;
        await this.save();
        Logger.log(`Mod ${this.id} approved by ${user.username}`);
        return this;
    }
}

export class ModVersion extends Model<InferAttributes<ModVersion>, InferCreationAttributes<ModVersion>> {
    declare readonly id: number;
    declare modId: number;
    declare authorId: number;
    declare modVersion: SemVer;
    declare supportedGameVersionIds: number[];
    declare visibility: Visibility;
    declare dependencies: number[]; // array of modVersion ids
    declare platform: Platform;
    declare zipHash: string;
    declare contentHashes: ContentHash[];
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    public async setVisibility(visibility:Visibility, user: User) {
        this.visibility = visibility;
        await this.save();
        Logger.log(`ModVersion ${this.id} approved by ${user.username}`);
        return this;
    }

    public static async checkForExistingVersion(modId: number, version: SemVer, gameVersionId: number, platform: Platform): Promise<ModVersion | null> {
        let modVersion = await DatabaseHelper.database.ModVersions.findAll({ where: { modId: modId, modVersion: version.raw, platform } });
        if (!modVersion) {
            return null;
        }
        
        for (let version of modVersion.sort((a, b) => a.modVersion.compare(b.modVersion))) {
            if (version.supportedGameVersionIds.includes(gameVersionId)) {
                return version;
            }
        }
        return null;
    }

    public async getSupportedGameVersions(): Promise<GameVersion[]> {
        let gameVersions: GameVersion[] = [];
        for (let versionId of this.supportedGameVersionIds) {
            let version = await DatabaseHelper.database.GameVersions.findByPk(versionId);
            if (version) {
                gameVersions.push(version);
            }
        }
        return gameVersions;
    }

    public async getDependencies(): Promise<ModVersion[]> {
        let dependencies: ModVersion[] = [];
        for (let dependancyId of this.dependencies) {
            let dependancy = await DatabaseHelper.database.ModVersions.findByPk(dependancyId);
            if (dependancy) {
                dependencies.push(dependancy);
            }
        }
        return dependencies;
    }

    public async toJSONWithGameVersions() {
        return {
            id: this.id,
            modId: this.modId,
            authorId: this.authorId,
            modVersion: this.modVersion,
            platform: this.platform,
            zipHash: this.zipHash,
            visibility: this.visibility,
            dependencies: this.dependencies,
            contentHashes: this.contentHashes,
            supportedGameVersions: await this.getSupportedGameVersions(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    public async toAPIResonse() {
        return {
            id: this.id,
            modId: this.modId,
            authorId: this.authorId,
            modVersion: this.modVersion.raw,
            platform: this.platform,
            zipHash: this.zipHash,
            visibility: this.visibility,
            dependencies: this.dependencies,
            contentHashes: this.contentHashes,
            supportedGameVersions: await this.getSupportedGameVersions(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    // this function is for when a mod supports a newer version but the dependancy does not. (uses ^x.x.x for comparison)
    public static async isValidDependancySucessor(originalVersion:ModVersion, newVersion:ModVersion, forVersion: number): Promise<boolean> {
        let originalGameVersions = await originalVersion.getSupportedGameVersions();
        let newGameVersions = await newVersion.getSupportedGameVersions();

        if (originalGameVersions.find((version) => version.id == forVersion)) {
            return false;
        }

        if (!newGameVersions.find((version) => version.id == forVersion)) {
            return false;
        }

        return satisfies(newVersion.modVersion, `^${originalVersion.modVersion.raw}`);
    }

}

export type ModVersionApproval = InferAttributes<ModVersion, { omit: `modId` | `id` | `createdAt` | `updatedAt` | `authorId` | `visibility` | `contentHashes` | `zipHash`}>
export type ModApproval = InferAttributes<Mod, { omit: `id` | `createdAt` | `updatedAt` | `iconFileName` | `visibility` }>

//this is gonna be fun :3
export class EditApprovalQueue extends Model<InferAttributes<EditApprovalQueue>, InferCreationAttributes<EditApprovalQueue>> {
    declare readonly id: number;
    declare submitterId: number;
    declare objId: number;
    declare objTableName: `modVersions` | `mods`;
    declare obj: ModVersionApproval | ModApproval;

    declare approverId: number;
    declare approved: boolean;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    public async approve(user: User) {
        if (this.objTableName == `modVersions` && `modVersion` in this.obj) {
            let modVersion = await DatabaseHelper.database.ModVersions.findByPk(this.objId);
            if (modVersion) {
                modVersion.modVersion = this.obj.modVersion || modVersion.modVersion;
                modVersion.platform = this.obj.platform || modVersion.platform;
                modVersion.supportedGameVersionIds = this.obj.supportedGameVersionIds || modVersion.supportedGameVersionIds;
                modVersion.dependencies = this.obj.dependencies || modVersion.dependencies;
                modVersion.visibility = Visibility.Verified;
                modVersion.save();
            }
        } else if (this.objTableName == `mods` && `name` in this.obj) {
            let mod = await DatabaseHelper.database.Mods.findByPk(this.objId);
            if (mod) {
                mod.name = this.obj.name || mod.name;
                mod.description = this.obj.description || mod.description;
                mod.category = this.obj.category || mod.category;
                mod.gitUrl = this.obj.gitUrl || mod.gitUrl;
                mod.authorIds = this.obj.authorIds || mod.authorIds;
                mod.visibility = Visibility.Verified;
                mod.save();
            }
        }
        this.approved = true;
        this.approverId = user.id;
        this.save();
    }
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

export enum Visibility {
    Private = `private`,
    Removed = `removed`,
    Unverified = `unverified`,
    Verified = `verified`,
}

export enum Categories {
    Core = `core`,
    Library = `library`,
    Cosmetic = `cosmetic`,
    PracticeTraining = `practice`,
    Gameplay = `gameplay`,
    StreamTools = `streamtools`,
    UIEnchancements = `ui`,
    Lighting = `lighting`,
    TweaksTools = `tweaks`,
    Multiplayer = `multiplayer`,
    TextChanges = `text`,
    Editor = `editor`,
    Other = `other`,
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

    public static isValidPlatform(value: string): value is Platform {
        return validateEnumValue(value, Platform);
    }
    
    public static isValidVisibility(value: string): value is Visibility {
        return validateEnumValue(value, Visibility);
    }

    public static async isValidGameName(name: string): Promise<boolean> {
        if (!name) {
            return false;
        }
        let game = await DatabaseHelper.database.GameVersions.findOne({ where: { gameName: name } });
        return !!game; // apperently this is a way to check if an object is null
    }

    public static isValidCategory(value: string): value is Categories {
        return validateEnumValue(value, Categories);
    }


    public static async isValidGameVersion(gameName: string, version: string): Promise<number | null> {
        if (!gameName || !version) {
            return null;
        }
        let game = await DatabaseHelper.database.GameVersions.findOne({ where: { gameName: gameName, version: version } });
        return game ? game.id : null;
    }
}