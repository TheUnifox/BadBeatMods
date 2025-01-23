// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//// @ts-nocheck
import path from 'path';
import { Categories, Mod, Platform, Status, UserRoles } from '../shared/Database';
import swaggerAutogen from 'swagger-autogen';
import { OpenAPIV3 } from 'openapi-types';
import { object } from 'zod';
import { platform } from 'os';

// docs: https://swagger-autogen.github.io/docs/getting-started/quick-start/
const options = {
    openapi: `3.0.0`,
    language: `en-US`,
};

// #region Raw DB Objects
const ModDBObject: OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        id: {
            type: `integer`,
            description: `The mod's internal ID.`,
            example: 1
        },
        name: {
            type: `string`,
            description: `The name of the mod.`,
            example: `Example Mod`
        },
        summary: {
            type: `string`,
            description: `The summary of the mod.`,
            example: `This is an example mod.`
        },
        description: {
            type: `string`,
            description: `The description of the mod. Supports markdown.`,
            example: `This is an example mod.`
        },
        gameName: {
            type: `string`,
            description: `The name of the game this mod is for. This is used to identify the game.`,
            example: `BeatSaber`,
            default: `BeatSaber`
        },
        category: {
            type: `string`,
            enum: Object.values(Categories),
        },
        authorIds: {
            type: `array`,
            items: { type: `number` },
        },
        status: {
            type: `string`,
            enum: Object.values(Status),
        },
        iconFileName: {
            type: `string`,
            default: `default.png`,
        },
        gitUrl: {
            type: `string`,
        },
        lastApprovedById: {
            type: `integer`,
            nullable: true,
            default: null,
        },
        lastUpdatedById: {
            type: `integer`,
        },
        createdAt: {
            type: `string`,
            description: `The date the mod was added to the API.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        updatedAt: {
            type: `string`,
            description: `The date the mod was last updated.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        deletedAt: {
            type: `string`,
            description: `The date the mod was deleted from the API.`,
            example: `2023-10-01T00:00:00.000Z`,
            nullable: true
        }
    }
};
const ModVersionDBObject: OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        id: {
            type: `integer`,
            description: `The version's internal ID.`,
            example: 1
        },
        modId: {
            type: `integer`,
            description: `The parent mod's internal ID.`,
            example: 1
        },
        modVersion: {
            type: `string`,
            description: `The version string. This is used to identify the version of the mod. This must be SemVer compliant.`,
            example: `1.0.0`
        },
        authorId: {
            type: `integer`,
            description: `The ID of the user who authored this version.`
        },
        platform: {
            type: `string`,
            enum: Object.values(Platform),
        },
        zipHash: {
            type: `string`,
            description: `The hash of the zip file. This is used to find and download the zip file. Will be a MD5 hash.`,
            example: `34e6985de8fbf7b525fc841c2cb45786`
        },
        contentHashes: {
            type: `object`,
            properties: {
                path: {
                    type: `string`,
                },
                hash: {
                    type: `string`,
                }
            }
        },
        status: {
            type: `string`,
            enum: Object.values(Status),
        },
        dependencies: {
            type: `array`,
            items: { type: `integer`, description: `The ID of the mod version this version depends on.` },
        },
        supportedGameVersionIds: {
            type: `array`,
            items: { type: `integer`, description: `The ID of the game version this version supports.` },
        },
        downloadCount: {
            type: `integer`,
        },
        createdAt: {
            type: `string`,
            description: `The date the version was added to the API.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        updatedAt: {
            type: `string`,
            description: `The date the version was last updated.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        deletedAt: {
            type: `string`,
            description: `The date the version was deleted from the API.`,
            example: `2023-10-01T00:00:00.000Z`,
            nullable: true
        }
    }
};
const UserDBObject: OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        id: {
            type: `integer`,
            description: `The user's internal ID.`,
            example: 1
        },
        username: {
            type: `string`,
            description: `The user's username from GitHub.`,
            example: `saeraphinx`,
        },
        githubId: {
            type: `integer`,
            description: `The user's GitHub ID.`,
            example: 123456789,
            nullable: true
        },
        sponsorUrl: {
            type: `string`,
            description: `The URL to support the user's works financially.`,
            example: `https://www.patreon.com/c/beatsabermods`,
            default: null,
            nullable: true
        },
        displayName: {
            type: `string`,
            description: `The user's display name from GitHub. Is editable after registration, and can be different from the GitHub username/display name.`,
            example: `Saeraphinx`,
        },
        roles: {
            type: `object`,
            properties: {
                siteide: {
                    type: `array`,
                    items: { type: `string`, enum: Object.values(UserRoles) },
                    default: [],
                    example: [`admin`],
                    description: `Site-wide roles. Takes precedence over per-game roles.`
                },
                perGame: {
                    type: `object`,
                    example: {
                        "BeatSaber": [`approver`]
                    }
                }
            },
            default: {
                siteide: [],
                perGame: {}
            },
            example: {
                siteide: [`admin`],
                perGame: {
                    "BeatSaber": [`approver`]
                }
            }
        },
        bio: {
            type: `string`,
            description: `The user's bio from GitHub. Is editable after registration. Supports markdown.`,
            example: `j`
        },
        createdAt: {
            type: `string`,
            description: `The date the user registered to the API.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        updatedAt: {
            type: `string`,
            description: `The date the profile was last updated.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        deletedAt: {
            type: `string`,
            description: `The date the user was deleted from the API.`,
            example: `2023-10-01T00:00:00.000Z`,
            nullable: true
        }
    }
};
const GameVersionDBObject: OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        id: {
            type: `integer`,
            description: `The version's internal ID.`,
            example: 1
        },
        gameName: {
            type: `string`,
            description: `The name of the game this version is for. This is used to identify the game.`,
            example: `BeatSaber`
        },
        version: {
            type: `string`,
            description: `The version string. This is used to identify the version of the game.`,
            example: `1.0.0`
        },
        createdAt: {
            type: `string`,
            description: `The date the version was added to the API.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        updatedAt: {
            type: `string`,
            description: `The date the version was last updated.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        deletedAt: {
            type: `string`,
            description: `The date the version was deleted from the API.`,
            example: `2023-10-01T00:00:00.000Z`,
            nullable: true
        }
    }
};
const EditApprovalQueueDBObject: OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        id: {
            type: `integer`,
            description: `The queue item's internal ID.`,
            example: 1
        },
        submitterId: {
            type: `integer`,
            description: `The ID of the user who submitted this edit.`
        },
        objectId: {
            type: `integer`,
            description: `The ID of the object being edited.`
        },
        objectTableName: {
            type: `string`,
            description: `The name of the table that objectId belongs to.`
        },
        object: {
            type: `object`,
            properties: {
                modVersion: ModVersionDBObject.properties!.modVersion,
                platform: ModVersionDBObject.properties!.platform,
                dependnecies: ModVersionDBObject.properties!.dependencies,
                supportedGameVersionIds: ModVersionDBObject.properties!.supportedGameVersionIds,

                name: ModDBObject.properties!.name,
                summary: ModDBObject.properties!.summary,
                description: ModDBObject.properties!.description,
                gameName: ModDBObject.properties!.gameName,
                category: ModDBObject.properties!.category,
                authorIds: ModDBObject.properties!.authorIds,
                gitUrl: ModDBObject.properties!.gitUrl,
            }
        },
        approverId: {
            type: `integer`,
            description: `The ID of the user who approved this edit.`,
            nullable: true,
            default: null,
            example: 1
        },
        approved: {
            type: `boolean`,
            description: `Whether the edit has been approved or not.`,
            example: false,
            default: null,
            nullable: true
        },
        createdAt: {
            type: `string`,
            description: `The date the queue item was added to the API.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        updatedAt: {
            type: `string`,
            description: `The date the queue item was last updated.`,
            example: `2023-10-01T00:00:00.000Z`
        },
        deletedAt: {
            type: `string`,
            description: `The date the queue item was deleted from the API.`,
            example: `2023-10-01T00:00:00.000Z`,
            nullable: true
        }
    }
};
// #endregion
const APIStatus:OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        message: {
            type: `string`,
            description: `Status message.`,
            example: `API is running.`,
            default: `API is running.`
        },
        veryImportantMessage: {
            type: `string`,
            description: `Very important message.`,
            example: `pink cute, era cute, lillie cute, william gay`,
            default: `pink cute, era cute, lillie cute, william gay`
        },
        apiVersion: {
            type: `string`,
            description: `API version (as seen in documentation).`,
            example: `0.0.1`,
            default: `Version not found.`
        },
        gitVersion: {
            type: `string`,
            description: `Git commit hash.`,
            example: `3d94a00`,
            default: `Version not found.`
        },
        isDocker: {
            type: `boolean`,
            description: `Whether the API is running in Docker or not.`,
            example: true,
            default: false
        }
    }
};
// #region API Public Responses
const UserAPIPublicResponse: OpenAPIV3.SchemaObject = UserDBObject;
const GameVersionAPIPublicResponse: OpenAPIV3.SchemaObject = GameVersionDBObject;
const ModAPIPublicResponse: OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        id: ModDBObject.properties!.id,
        name: ModDBObject.properties!.name,
        summary: ModDBObject.properties!.summary,
        description: ModDBObject.properties!.description,
        gameName: ModDBObject.properties!.gameName,
        category: ModDBObject.properties!.category,
        authors: {
            type: `array`,
            items: { allOf: [{ $ref: `#/components/schemas/UserAPIPublicResponse` }] },
        },
        status: ModDBObject.properties!.status,
        iconFileName: ModDBObject.properties!.iconFileName,
        gitUrl: ModDBObject.properties!.gitUrl,
        lastApprovedById: ModDBObject.properties!.lastApprovedById,
        lastUpdatedById: ModDBObject.properties!.lastUpdatedById,
        createdAt: ModDBObject.properties!.createdAt,
        updatedAt: ModDBObject.properties!.updatedAt,
    }
};
const ModVersionAPIPublicResponse: OpenAPIV3.SchemaObject = {
    type: `object`,
    properties: {
        id: ModVersionDBObject.properties!.id,
        modId: ModVersionDBObject.properties!.modId,
        modVersion: ModVersionDBObject.properties!.modVersion,
        author: {
            $ref: `#/components/schemas/UserAPIPublicResponse`
        },
        platform: ModVersionDBObject.properties!.platform,
        zipHash: ModVersionDBObject.properties!.zipHash,
        contentHashes: ModVersionDBObject.properties!.contentHashes,
        status: ModVersionDBObject.properties!.status,
        dependencies: ModVersionDBObject.properties!.dependencies,
        supportedGameVersions: {
            type: `array`,
            items: { allOf: [{ $ref: `#/components/schemas/GameVersionAPIPublicResponse` }] },
        },
        downloadCount: ModVersionDBObject.properties!.downloadCount,
        createdAt: ModVersionDBObject.properties!.createdAt,
        updatedAt: ModVersionDBObject.properties!.updatedAt
    },
};
// #endregion
// #region Approver Endpoint Responses
// #endregion


const doc = {
    info: {
        title: `BadBeatMods API`,
        description: `This isn't really fully complete, but its better than absolutely nothing.\n\nThis API documentation is automatically generated and therefor may not be 100% accurate and may be missing a few fields.`,
        version: `0.0.1`,
    },
    host: `bbm.saera.gay`,
    basePath: `/`,
    consumes: [`application/json`, `multipart/form-data`, `application/x-www-form-urlencoded`],
    produces: [`application/json`],
    schemes: [`https`, `http`],
    tags: [
        { name: `Status`, description: `Status related endpoints` },
        { name: `Mods`, description: `Mod related endpoints` },
        { name: `Versions`, description: `Version Management` },
        { name: `MOTD`, description: `Message of the Day related endpoints` },
        { name: `Approval`, description: `Approval related endpoints` },
        { name: `Users`, description: `User related endpoints` },
        { name: `Admin`, description: `Admin related endpoints` },
        { name: `Bulk Actions`, description: `Actions that allow you to skip calling the same endpoint over and over again` },
        { name: `Auth`, description: `Authentication related endpoints` },
        { name: `BeatMods`, description: `Legacy BeatMods API endpoints` },
    ],
    components: {
        "@schemas": {
            ModAPIPublicResponse,
            ModVersionAPIPublicResponse,
            UserAPIPublicResponse,
            GameVersionAPIPublicResponse,
            APIStatus,
        }
    }
};

const outputFile = `./swagger.json`;
const routes = [
    `./routes/beatmods.ts`,
    `./routes/getMod.ts`,
    `./routes/createMod.ts`,
    `./routes/updateMod.ts`,
    `./routes/auth.ts`,
    `./routes/versions.ts`,
    `./routes/import.ts`,
    `./routes/admin.ts`,
    `./routes/approval.ts`,
    `./routes/motd.ts`,
    `./routes/users.ts`,
    `./routes/status.ts`,
];

swaggerAutogen(options)(outputFile, routes, doc);