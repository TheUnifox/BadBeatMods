import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { HTTPTools } from './shared/HTTPTools';
import { DatabaseManager } from './shared/Database';
import path from 'path';
import fileUpload from 'express-fileupload';
import { CreateModRoutes } from './api/routes/createMod';
import rateLimit from 'express-rate-limit';
import { Logger } from './shared/Logger';
import { GetModRoutes } from './api/routes/getMod';
import { Config } from './shared/Config';

console.log(`Starting setup...`);
new Config();
const app = express();
const memstore = MemoryStore(session);
const port = Config.server.port;
new DatabaseManager();

app.use(express.json({ limit: 100000 }));
app.use(express.urlencoded({limit : 10000, parameterLimit: 10 }));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
}));
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    statusCode: 429,
    message: `Rate limit exceeded.`,
    skipSuccessfulRequests: true
}));
app.use(session({
    secret: Config.server.sessionSecret,
    name: `session`,
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
app.use((req, res, next) => {
    if (Config.devmode) {
        if (Config.authBypass) {
            req.session.userId = 1;
            req.session.username = `TestUser`;
            req.session.avatarUrl = `https://cdn.discordapp.com/avatars/1/1.png`;
        }
        console.log(req.url);
    }
    next();
});

//app.use(`/api`, Validator.runValidator);

new CreateModRoutes(app);
new GetModRoutes(app);


app.use(express.static(path.join(__dirname, `../assets/static`), {
    extensions: [`html`],
    index: `index.html`,
    dotfiles: `ignore`
}));

app.use(`/profile`, express.static(path.join(__dirname, `../assets/profile`), {
    extensions: [`html`],
    index: `profile.html`,
    dotfiles: `ignore`
}));

app.use(`/mod`, express.static(path.join(__dirname, `../assets/mod`), {
    extensions: [`html`],
    index: `mod.html`,
    dotfiles: `ignore`
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