# BadBSMods
A BeatMods replacement.

## Config: 
```json
{
    "auth" : {
        "discord": {
            "clientId": "123456789012345678",
            "clientSecret": "supersecret"
        },
        "github": {
            "clientId": "123456789012345678",
            "clientSecret": "supersecret"
        }
    },
    "storage" : { // you will likely need to create these directories
        "database" : "./storage/database.sqlite",
        "uploadsDir" : "./storage/uploads",
        "iconsDir" : "./storage/icons"
    },
    "devmode" : false, //disable this
    "authBypass" : false, //disable this
    "server" : {
        "port" : 5001,
        "url" : "http://localhost",
        "sessionSecret" : "supersecret" //change this
    }
}
```