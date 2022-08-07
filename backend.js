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
let client;

// Domain Setup Changes
let d;
if(config.domain.endsWith('/')) {
    d = config.domain;
} else {
    d = config.domain + '/';
};

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