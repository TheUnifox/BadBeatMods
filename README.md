![BadBeatMods](https://github.com/Saeraphinx/badbeatmods/blob/main/assets/banner.png)
A game-agnostic mod hosting platform.

## Running the Server
Running the server is (mostly) easy to do:
1. Clone the Repo.
2. Run `npm i` to install packages.
3. Run `npm run start` to start the server.

The default location for anything that needs to presist is a folder called `storage`. This will includes the database and user uploads. This should be automatically created when the server starts. You can find the config file at `storage/config.json`.

If you are using the docker image, the storage directory will be located at `/app/storage`. The port is set to `5001` by default.

## Config
See [`src/shared/config.json`](https://github.com/Saeraphinx/BadBeatMods/blob/main/src/shared/Config.ts) for more info regarding the config file. This file is created when the server starts if it does not exist. The config file should also update itself if any new options get added. It will backup the old config file and create a new one with the new options.
