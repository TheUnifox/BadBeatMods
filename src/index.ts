import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { HTTPTools } from './shared/HTTPTools';
import { DatabaseHelper, DatabaseManager } from './shared/Database';
import path from 'path';
import fileUpload from 'express-fileupload';
import { CreateModRoutes } from './api/routes/createMod';
import rateLimit from 'express-rate-limit';
import { Logger } from './shared/Logger';
import { GetModRoutes } from './api/routes/getMod';
import { Config } from './shared/Config';
import { UpdateModRoutes } from './api/routes/updateMod';
import { AuthRoutes } from './api/routes/auth';
import { MiscRoutes } from './api/routes/misc';
import { ImportRoutes } from './api/routes/import';
import { AdminRoutes } from './api/routes/admin';
import { ApprovalRoutes } from './api/routes/approval';
import { Luma } from './discord/classes/Luma';
import { ActivityType } from 'discord.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './api/swagger.json';

console.log(`Starting setup...`);
new Config();
const app = express();
const memstore = MemoryStore(session);
const port = Config.server.port;
new DatabaseManager();

if (Config.bot.enabled) {
    const luma = new Luma({
        intents: [],
        presence: {activities: [{name: `with your mods`, type: ActivityType.Playing}], status: `online`}});
    luma.login(Config.bot.token);
}

// handle parsing request bodies
app.use(express.json({ limit: 100000 }));
app.use(express.urlencoded({limit : 10000, parameterLimit: 10, extended: false }));
app.use(fileUpload({
    limits: {
        fileSize: 75 * 1024 * 1024, // here you go kaitlyn
        files: 1
    },
    abortOnLimit: true,
}));

// rate limiting
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    statusCode: 429,
    message: `Rate limit exceeded.`,
    skipSuccessfulRequests: true,
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
        secure: false,
        httpOnly: true,
        sameSite: `strict`
    }
}));
app.set(`trust proxy`, `uniquelocal, loopback`);

app.use((req, res, next) => {
    if (Config.devmode) {
        if (Config.authBypass) {
            req.session.userId = 1;
            req.session.username = `TestUser`;
            req.session.avatarUrl = `${Config.server.url}/favicon.ico`;
        }
        console.log(req.url);
    }
    next();
});

//app.use(`/api`, Validator.runValidator);

new CreateModRoutes(app);
new GetModRoutes(app);
new UpdateModRoutes(app);
new ApprovalRoutes(app);
new AuthRoutes(app);
new ImportRoutes(app);
new AdminRoutes(app);
new MiscRoutes(app);

swaggerDocument.host = Config.server.url.replace(`http://`, ``).replace(`https://`, ``);
app.use(`/api/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get(`/favicon.ico`, (req, res) => {
    res.sendFile(path.resolve(`./assets/favicon.ico`), {
        maxAge: 1000 * 60 * 60 * 24 * 1,
        //immutable: true,
        lastModified: true,
    });
});

app.get(`/banner.png`, (req, res) => {
    res.sendFile(path.resolve(`./assets/banner.png`), {
        maxAge: 1000 * 60 * 60 * 24 * 1,
        //immutable: true,
        lastModified: true,
    });
});

app.use(`/cdn/icon`, express.static(path.resolve(Config.storage.iconsDir), {
    extensions: [`png`],
    dotfiles: `ignore`,
    immutable: true,
    index: false,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    fallthrough: false,
}));

app.use(`/cdn/mod`, express.static(path.resolve(Config.storage.modsDir), {
    extensions: [`zip`],
    dotfiles: `ignore`,
    immutable: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    setHeaders: (res, file) => { // this is a hacky workaround to get code to execute when a file is served, but it should work with minimal preformance impact
        res.set(`Content-Disposition`, `attachment`);
        let hash = path.basename(file).replace(path.extname(file), ``);
        DatabaseHelper.database.ModVersions.findOne({ where: { zipHash: hash } }).then((version) => {
            version.increment(`downloadCount`);
        }).catch((error) => {
            Config.devmode ? Logger.warn(`Error incrementing download count: ${error}`) : null;
        });
    },
    fallthrough: false,
}));

HTTPTools.handleExpressShenanigans(app);

app.listen(port, () => {
    console.log(`Server listening @ http://localhost:${port}`);
});

process.on(`exit`, (code) => {
    Logger.log(`Process exiting with code ${code}`);
});

process.on(`SIGTERM`, () => {
    Logger.log(`Received SIGTERM, exiting.`);
});

process.on(`SIGINT`, () => {
    Logger.log(`Received SIGINT, exiting.`);
});

process.on(`SIGQUIT`, () => {
    Logger.log(`Received SIGQUIT, exiting.`);
});


console.log(`Setup complete.`);