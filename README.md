![BadBSMods](https://github.com/Saeraphinx/badbsmods/blob/main/assets/banner.png)
A game-agnostic BeatMods replacement.

## Running the Server
Running the server is (mostly) easy to do:
1. Clone the Repo.
2. Run `npm i` to install packages.
3. Run `npm run start` to start the server.

The default location for anything that needs to presist is a folder called `storage`. This will includes the database and user uploads. This should be automatically created when the server starts. You can find the config file at `storage/config.json`.

## Config: 
Auth: OAuth2 Info  
Database: Supports `sqlite` and `postgres`. URL can be replaced with a postgres URL.  
Storage: Paths for user uploads  
devmode: Enables additional logging  
authBypass: Authenticates every request as the built in Server Admin  
Server: Hosting info. URL is a url without the `/` at the end. Used for Swagger and OAuth2 redirects.  
Webooks: For logging & approval webhook  
Bot: Discord bot for looking up mods and other mayybe fun things
