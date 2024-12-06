import swaggerAutogen from 'swagger-autogen';

const doc = {
    info: {
        title: `BadBeatMods API`,
        description: `Description`
    },
    host: `localhost:5001`,
    basePath: `/api`,
    consumes: [`application/json`, `multipart/form-data`, `application/x-www-form-urlencoded`],
    produces: [`application/json`],
};

const outputFile = `./swagger.json`;
const routes = [`./routes/getMod.ts`];

swaggerAutogen()(outputFile, routes, doc);