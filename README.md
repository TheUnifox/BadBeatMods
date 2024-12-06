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
    "database": {
        "dialect": "sqlite",
        "url": "./storage/database.sqlite",
        "username": "user",
        "password": "password"
    },
    "storage" : {
        "uploadsDir" : "./storage/uploads",
        "iconsDir" : "./storage/icons"
    },
    "devmode" : true,
    "authBypass" : true,
    "server" : {
        "port" : 5001,
        "url" : "http://localhost:5001",
        "sessionSecret" : "supersecret"
    },
    "webhooks" : {
        "disableWebhooks": true,
        "loggingUrl": "test",
        "modLogUrl": "test"
    },
    "bot" : {
        "clientId": "123456789012345678",
        "token" : "supersecret"
    }
}
```