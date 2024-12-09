![BadBSMods](https://github.com/Saeraphinx/badbsmods/blob/main/assets/banner.png)
A game-agnostic BeatMods replacement.

BadBSMods/BadBeatMods (haven't decided which name to go trhough with yet, badbsmods is just what I keep calling it on accident, so it might be better to go with that tbh) is a (currently backend only) replacement for [BeatMods](https://github.com/bsmg/BeatMods-Website). It functions in a very different way from BeatMods though. Some big points being that mods do not need to be reuploaded for every single version, and the server is game-agnostic. It is written in Typescript, and primarially uses Express & Sequelize. It is still very much in active development, so please do keep that in mind. You can find all of the models for the database in [`src/shared/Database.ts`](https://github.com/Saeraphinx/badbsmods/blob/main/src/shared/Database.ts). The server is written with the intent of using SQLite as its main database, but it should support postgres (and in theory every database that Sequelize supports).

If anyone has any questions, comments, or feature requests, please let me (Saera) know as soon as possible. This is the best time to tell me to change something.
## Main Differences & Things to Note
> [!NOTE]
> I might be missing a few things in this section.
- Mods do NOT need to be reuploaded for new game versions (assuming nothing breaks in the mod).
- Mods MUST have an icon (A default one is available if an icon is not specified).
- Mod metadata is updatable without a reupload.
- Aliases from BeatMods do not exist.
- Accounts are made using GitHub OAuth2. You are able to link your Discord account for contact only.
- Users can have profiles (see `User` in the Database)
- The `required` field from BeatMods is not present (Will probably be replaced with a Category).
- Old BeatMods endpoint now requires the `gameVersion` parameter (it will assume latest if not provided).

## How are mods done differently?
> [!NOTE]
> This section is not complete, and might be inaccurate due to the project still being in active development.

In BadBeatMods, mods are stored in two parts:
1. `Mod`, responsible for mod metadata (such as name, description, gitUrl, category, etc), and
2. `ModVersion`, responsible for the zip file itself (such as hashes, dependancies, version, supportedGameVersion, platform, etc)
  
The process of uploading a new mod would look something like this:
1. Create a `Mod`, and fill in information
2. Using the `Mod`'s id that you just created, you'll make a new `ModVersion`, and supply it with the list of dependancies (which is an array of `ModVersion` IDs, the Mod Version (in SemVer), and the supported game versions), along with everything else it requires
