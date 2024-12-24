import { z } from "zod";
import { Categories, SupportedGames } from "./Database";

const ZodMod = z.object({
    id: z.number(),
    name: z.string().min(3).max(64),
    summary: z.string().min(3).max(200),
    description: z.string().min(3).max(4096),
    category: z.nativeEnum(Categories),
    gitUrl: z.string().min(5).max(256).url(),
    gameName: z.nativeEnum(SupportedGames), //z.string().min(3).max(256),
    authorIds: z.array(z.number())
});

const ZodModVersion = z.object({
    id: z.number(),
    modId: z.number(),
    gameVersionId: z.number(),
    modVersion: z.string(),
    dependencies: z.array(z.number()),
    platform: z.string(),
    status: z.string()
});

export const ZodCreateMod = z.object({
    name: ZodMod.shape.name,
    summary: ZodMod.shape.summary,
    description: ZodMod.shape.description,
    category: ZodMod.shape.category,
    gitUrl: ZodMod.shape.gitUrl,
    gameName: ZodMod.shape.gameName,
}).required();

