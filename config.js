const config = {

    // Main Website Settings
    port: "3059",
    domain: "https://freecdn.lol",
    debugmode: true,

    // MySQL Settings
    database: {
        host: "localhost",
        user: "root",
        password: "",
        database: "freecdn"
    },

    // Website OAuth2 Tokens
    tokens: {
        token: "BOT_TOKEN",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET"
    },

    // Webhook Settings
    webhook: {
        url: "", // The global webhook for all new images (leave empty to disable)
        username: "FreeCDN", //The username for the webhook
        avatarURL: "https://cdn.hyperz.net/u/main/og0ysds.png" // The image URL for the webhooks avatar
    },

    // SEO Settings
    seoSettings: {
        title: "FreeCDN", // The title of the website
        description: "FreeCDN is an open-source image sharing server that allows you to upload screenshots quickly, it was created by Standard Software Systems!", // The description of the website
        imageURL: "https://cdn.hyperz.net/u/main/og0ysds.png" // The image URL for the website
    },

    // Other Settings
    ownerIds: ["704094587836301392", "YOUR_USER_ID"], // Discord Ids for the owners of the bot that can manage things...
    themeColor: "#0C1017", // The theme color for the application
    fileNameLength: 8, // The length of the file name
    maxFolderSize: 2000 // The max size of the folder in MB (5000 = 5000 Megabytes)

}

module.exports = config;
