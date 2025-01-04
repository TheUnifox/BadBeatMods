import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { DatabaseHelper, DatabaseManager } from './shared/Database';
import fileUpload from 'express-fileupload';
import { CreateModRoutes } from './api/routes/createMod';
import rateLimit from 'express-rate-limit';
import { Logger } from './shared/Logger';
import { GetModRoutes } from './api/routes/getMod';
import { Config } from './shared/Config';
import { UpdateModRoutes } from './api/routes/updateMod';
import { AuthRoutes } from './api/routes/auth';
import { VersionsRoutes } from './api/routes/versions';
import { ImportRoutes } from './api/routes/import';
import { AdminRoutes } from './api/routes/admin';
import { ApprovalRoutes } from './api/routes/approval';
import { Luma } from './discord/classes/Luma';
import { ActivityType } from 'discord.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './api/swagger.json';
import { BeatModsRoutes } from './api/routes/beatmods';
import { CDNRoutes } from './api/routes/cdn';
import cors from 'cors';
import { MOTDRoutes } from './api/routes/motd';
import { UserRoutes } from './api/routes/users';
import path from 'node:path';
import fs from 'node:fs';

console.log(`Starting setup...`);
new Config();
const app = express();
const memstore = MemoryStore(session);
const port = Config.server.port;
let database = new DatabaseManager();

// handle parsing request bodies
app.use(express.json({ limit: 100000 }));
app.use(express.urlencoded({limit : 10000, parameterLimit: 10, extended: false }));
app.use(cors({
    origin: Config.server.corsOrigins,
    credentials: Config.server.iHateSecurity ? true : false,
}));
app.use(fileUpload({
    limits: {
        fileSize: 75 * 1024 * 1024, // here you go kaitlyn
        files: 1
    },
    abortOnLimit: true,
}));

// session handling
app.use(session({
    secret: Config.server.sessionSecret,
    name: `bbm_session`,
    store: new memstore({
        checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    unset: `destroy`,
    cookie: {
        maxAge: 86400000,
        secure: `auto`,
        httpOnly: true,
        sameSite: Config.server.iHateSecurity ? `none` : `strict`,
    }
}));
app.set(`trust proxy`, `uniquelocal, loopback`);

app.use((req, res, next) => {
    if (Config.devmode) {
        if (Config.authBypass) {
            req.session.userId = 1;
        }
        if (!req.url.includes(`hashlookup`)) {
            console.log(req.url);
        }
    }
    next();
});

let apiRouter = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false,
});

let cdnRouter = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false,
});

apiRouter.use(rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    statusCode: 429,
    message: `Rate limit exceeded.`,
    skipSuccessfulRequests: false,
}));

cdnRouter.use(rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    statusCode: 429,
    message: `Rate limit exceeded.`,
    skipSuccessfulRequests: false,
}));

//app.use(`/api`, Validator.runValidator);
if (Config.flags.enableBeatModsCompatibility) {
    new BeatModsRoutes(app, apiRouter);
}
new CreateModRoutes(apiRouter);
new GetModRoutes(apiRouter);
new UpdateModRoutes(apiRouter);
new ApprovalRoutes(apiRouter);
new AuthRoutes(apiRouter);
new ImportRoutes(apiRouter);
new AdminRoutes(apiRouter);
new VersionsRoutes(apiRouter);
new MOTDRoutes(apiRouter);
new UserRoutes(apiRouter);

if (Config.flags.enableSwagger) {
    swaggerDocument.host = `${Config.server.url.replace(`http://`, ``).replace(`https://`, ``)}${Config.server.apiRoute}`;
    apiRouter.use(`/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

if (Config.flags.enableFavicon) {
    app.get(`/favicon.ico`, (req, res) => {
        res.sendFile(path.resolve(`./assets/favicon.png`), {
            maxAge: 1000 * 60 * 60 * 24 * 1,
            //immutable: true,
            lastModified: true,
        });
    });
}
        
if (Config.flags.enableBanner) {
    app.get(`/banner.png`, (req, res) => {
        res.sendFile(path.resolve(`./assets/banner.png`), {
            maxAge: 1000 * 60 * 60 * 24 * 1,
            //immutable: true,
            lastModified: true,
        });
    });
}

if (Config.devmode && fs.existsSync(path.resolve(`./storage/frontend`))) {
    app.use(`/`, express.static(path.resolve(`./storage/frontend`), {
        dotfiles: `ignore`,
        immutable: false,
        index: true,
        maxAge: 1000 * 60 * 60 * 1,
        fallthrough: true,
    }));
}

new CDNRoutes(cdnRouter);

app.use(Config.server.apiRoute, apiRouter);
app.use(Config.server.cdnRoute, cdnRouter);

app.disable(`x-powered-by`);
// catch all unknown routes and return a 404
// eslint-disable-next-line @typescript-eslint/no-unused-vars
apiRouter.use((req, res, next) => {
    return res.status(404).send({message: `Unknown route.`});
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
cdnRouter.use((req, res, next) => {
    return res.status(404).send({message: `Unknown route.`});
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
apiRouter.use((err:any, req:any, res:any, next:any) => {
    console.error(err.stack);
    return res.status(500).send({message: `Server error`});
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
cdnRouter.use((err:any, req:any, res:any, next:any) => {
    console.error(err.stack);
    return res.status(500).send({message: `Server error`});
});

process.on(`exit`, (code) => {
    Logger.log(`Process exiting with code ${code}`);
});

process.on(`SIGTERM`, () => {
    Logger.log(`Received SIGTERM, exiting.`);
    DatabaseHelper.database.sequelize.close();
    process.exit(0);
});

process.on(`SIGINT`, () => {
    Logger.log(`Received SIGINT, exiting.`);
    DatabaseHelper.database.sequelize.close();
    process.exit(0);
});

process.on(`SIGQUIT`, () => {
    Logger.log(`Received SIGQUIT, exiting.`);
    DatabaseHelper.database.sequelize.close();
    process.exit(0);
});

process.on(`unhandledRejection`, (reason: Error | any, promise: Promise<any>) => {
    if (reason instanceof Error) {
        Logger.error(`Unhandled promise rejection:${reason.name}\n${reason.message}\n${reason.stack}`, `node.js`);
    } else {
        Logger.error(`Unhandled promise rejection:${reason}\n`, `node.js`);
    }
    process.exit(1);
});

console.log(`Setup complete.`);

async function startServer() {
    await database.init();
    console.log(`Starting server.`);
    app.listen(port, () => {
        console.log(`Server listening on port ${port} - Expected to be available at ${Config.server.url}`);
        Config.devmode ? Logger.warn(`Development mode is enabled!`) : null;
        Config.authBypass ? Logger.warn(`Authentication bypass is enabled!`) : null;
        Config.devmode ? console.log(`API docs @ http://localhost:${port}/api/docs`) : null;
    });
    
    if (Config.bot.enabled) {
        const luma = new Luma({
            intents: [],
            presence: {activities: [{name: `with your mods`, type: ActivityType.Playing}], status: `online`}});
        luma.login(Config.bot.token);
    }
}
startServer();