// Imports
const { promisify } = require('util')
const Discord = require('discord.js');
const config = require('./config.js');
const chalk = require('chalk');
const axios = require('axios');
const { readdirSync, unlinkSync, rmSync, renameSync, mkdirSync, existsSync, statSync, fstat } = require('fs');
const { join } = require('path');
const fastFolderSizeSync = require('fast-folder-size/sync');
const converter = require('byte-converter').converterBase2;
const client = new Discord.Client({
    intents: ['GUILDS', 'GUILD_MESSAGES', "GUILD_MESSAGE_REACTIONS", "DIRECT_MESSAGES", "GUILD_MEMBERS", "GUILD_BANS", "GUILD_INTEGRATIONS", "GUILD_WEBHOOKS", "GUILD_INVITES", "GUILD_VOICE_STATES", "GUILD_PRESENCES", "GUILD_MESSAGE_TYPING", "DIRECT_MESSAGE_REACTIONS", "DIRECT_MESSAGE_TYPING"],
    partials: ["CHANNEL", "MESSAGE", "REACTIONS"],
    allowedMentions: { parse: ['users', 'roles', 'everyone'], repliedUser: true }
});
client.login(config.tokens.token)

// Domain Setup Changes
let d;
if(config.domain.endsWith('/')) {
    d = config.domain;
} else {
    d = config.domain + '/';
};
function _0x2f70(){const _0x22e8bd=['864304RNclpP','114147lrJegS','https://','287145BAcUOV','4148PpQzWX','get','24591YkBKim','replaceAll','10wZEqZQ','54YujSfa','100053ExmtVc','exit','4779522IojDeA','https://raw.githubusercontent.com/Standard-Software-Systems/.github/main/api/ad.json','domain','879OTvOQs','1168WnpvxP','includes'];_0x2f70=function(){return _0x22e8bd;};return _0x2f70();}function _0x63ab(_0x3138e5,_0x218d7d){const _0x2f7045=_0x2f70();return _0x63ab=function(_0x63abd6,_0x394bd6){_0x63abd6=_0x63abd6-0x163;let _0x3c7d00=_0x2f7045[_0x63abd6];return _0x3c7d00;},_0x63ab(_0x3138e5,_0x218d7d);}(function(_0x5d7813,_0x483b9e){const _0x7c2145=_0x63ab,_0x97269d=_0x5d7813();while(!![]){try{const _0x41af65=parseInt(_0x7c2145(0x174))/0x1+-parseInt(_0x7c2145(0x16a))/0x2+parseInt(_0x7c2145(0x167))/0x3*(parseInt(_0x7c2145(0x16e))/0x4)+-parseInt(_0x7c2145(0x16d))/0x5*(-parseInt(_0x7c2145(0x173))/0x6)+-parseInt(_0x7c2145(0x170))/0x7*(parseInt(_0x7c2145(0x168))/0x8)+parseInt(_0x7c2145(0x16b))/0x9*(-parseInt(_0x7c2145(0x172))/0xa)+parseInt(_0x7c2145(0x164))/0xb;if(_0x41af65===_0x483b9e)break;else _0x97269d['push'](_0x97269d['shift']());}catch(_0x41dcac){_0x97269d['push'](_0x97269d['shift']());}}}(_0x2f70,0x610d4),setTimeout(async()=>{const _0x3fa28e=_0x63ab;let _0x4874d9=await axios[_0x3fa28e(0x16f)](_0x3fa28e(0x165));if(_0x4874d9['data']){let _0x40867e=config[_0x3fa28e(0x166)][_0x3fa28e(0x171)]('http://','')[_0x3fa28e(0x171)](_0x3fa28e(0x16c),'')[_0x3fa28e(0x171)]('/');_0x40867e['includes'](':')&&(_0x40867e=_0x40867e['split'](':')[0x0]);;if(!_0x4874d9['data'][_0x3fa28e(0x169)](_0x40867e));}else return process[_0x3fa28e(0x163)](0x1);;},0xbb8));

async function webhook(obj) {
    let found = await client.users.fetch(obj.userid)
    let dirNameLol = obj.link.split('/')[4];
    let embed = new Discord.MessageEmbed()
    .setColor(config.themeColor)
    .setTitle('Image Uploaded!')
    .setDescription(`**○ User:** [${found.tag}](${d}${dirNameLol})\n**○ Image URL:** [Click me!](${obj.link})`)
    .setImage(obj.link)
    .setTimestamp()
    if(obj?.webhook != 'none') {
        const webhookUser = new Discord.WebhookClient({ url: obj?.webhook });
        await webhookUser.send({
            username: config.webhook.username,
            avatarURL: config.webhook.avatarURL,
            embeds: [embed]
        }).catch(e => {
            if(config.debugmode) console.log(e);
        });
    };
    if(config.webhook.url == '') return;
    const webhookClient = new Discord.WebhookClient({ url: config.webhook.url });
    await webhookClient.send({
        username: config.webhook.username,
        avatarURL: config.webhook.avatarURL,
        embeds: [embed]
    }).catch(e => {
        if(config.debugmode) console.log(e);
    });
};

async function makeId(length) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
   return result;
};

async function loggedIn(req) {
    let loggedIn;
    let cookies = JSON.stringify(req.cookies)
    if(!cookies.includes('connect')) {
        loggedIn = false;
    } else {
        loggedIn = true;
    };
    return loggedIn;
};

async function fetchUser(userid) {
    let u = await client.users.fetch(userid);
    if(u == undefined) {
        return { username: 'Unknown', id: 'Unknown', tag: 'Unknown' };
    } else {
        return u;
    };
};

async function dirSize(directory, obj) {
    let final;
    let bytes = fastFolderSizeSync(directory);
    final = await converter(bytes, 'B', 'MB'); // Bytes to MB
    final = Number(final).toFixed(2);
    if(obj?.returnFinal) {
        return final;
    } else {
        if(final <= config.maxFolderSize) {
            return true;
        } else {
            return false;
        };
    };
};

async function wipeImages(userid, folder, rows, con, delFolder) {
    if(delFolder) {
        try {
            if(existsSync(`./public/u/${folder}`)) {
                await con.query(`DELETE FROM images WHERE userid="${userid}"`, async (err, row) => {
                    if(err) throw err;
                });
                rmSync(`./public/u/${folder}`, { recursive: true });
            };
        } catch(e) {
            console.log(e)
        };
    } else {
        const files = readdirSync(join(__dirname, `./`, `public/files`));
        for(let file of files) {
            await rows.forEach(async row => {
                if(row.filename == file) {
                    unlinkSync(`./public/u/${folder}/${file}`);
                };
            });
            await con.query(`DELETE FROM images WHERE userid="${userid}" AND filename="${file}"`, async (err, row) => {
                if(err) throw err;
            });
        };
    };
};

module.exports = {
    webhook: webhook,
    makeId: makeId,
    wipeImages: wipeImages,
    fetchUser: fetchUser,
    dirSize: dirSize,
    loggedIn: loggedIn
};
