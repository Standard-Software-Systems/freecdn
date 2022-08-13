// Imports
const express = require('express')
const app = express()
const chalk = require('chalk')
const nodelogger = require('hyperz-nodelogger')
const logger = new nodelogger()
const cookieParser = require('cookie-parser')
require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const fs = require("fs");
const path = require('path');
const multer  = require('multer');
const storage = multer.memoryStorage()
const upload = multer({ dest: './public/files', storage: storage });
const fileUpload = require('express-fileupload');
const config = require('./config.js');
const backend = require('./backend.js');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

let con;
let forbidden = ['/', '<', '>', ':', '"', '\'', '|', '?', '*'];

const { createConnection } = require('mysql') // Imports SQL Module
con = createConnection(config.database) // Defines Con Var
setTimeout(() => {
    console.log('MySQL Successfully Connected!')
}, 4000);

let d;
if(config.domain.endsWith('/')) {
    d = config.domain;
} else {
    d = config.domain + '/';
};

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(id, done) {
    done(null, user);
});
passport.use(
    new Strategy(
        {
            clientID: config.tokens.clientID,
            clientSecret: config.tokens.clientSecret,
            callbackURL: `${d}auth/discord/callback`,
            scope: ['identify', 'email']
        }, async function(accessToken, refreshToken, profile, done) {
            try {
                await con.query(`SELECT * FROM users WHERE userid='${profile?.id}'`, async function(err, row) {
                    if(err) console.log(err);
                    if(row[0]) {
                        return done(null, row[0]);
                    } else {
                        let folderName = profile?.id;
                        if(fs.existsSync(`./public/u/${folderName}`)) {
                            folderName = await backend.makeid(12);
                        };
                        let length = 28;
                        let cookie           = '';
                        let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        let charactersLength = characters.length;
                        for ( let i = 0; i < length; i++ ) {
                            cookie += characters.charAt(Math.floor(Math.random() * charactersLength));
                        }
                        let secret = await backend.makeId(12);
                        await con.query(`INSERT INTO users (userid, secret, folder, webhook, cookie, admin) VALUES ("${profile?.id}", "${secret}", "${profile?.id}", "none", "${cookie}", false)`, async (err, row) => {
                            if(err) throw err;
                        });
                        fs.mkdirSync(`./public/u/${folderName}`, { recursive: true });
                    };
                });
            } catch(e) {
                console.log(e)
                return done(e, null)
            }
        }
    )
);

// Static Files
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser())
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/css', express.static(__dirname + 'public/css'))
app.use('/js', express.static(__dirname + 'public/js'))
app.use('/u', express.static(__dirname + 'public/u'))
app.use('/assets', express.static(__dirname + 'public/assets'))
app.use(fileUpload());

// Set View's
app.set('views', './views');
app.set('view engine', 'ejs');

// Navigation (add pages here)
app.get('', async (req, res) => {
    let loggedIn = await backend.loggedIn(req);
    await con.query(`SELECT * FROM images`, async (err, row) => {
        if(err) throw err;
        let c = row.length || 0;
        await con.query(`SELECT * FROM users`, async (err, row) => {
            if(err) throw err;
            let u = row.length || 0;
            await con.query(`SELECT * FROM downloads`, async (err, row) => {
                if(err) throw err;
                let d = row.length || 0;
                res.render('index.ejs', { backend: backend, config: config, con: con, count: c, users: u, loggedIn: loggedIn, downloads: d})
            });
        });
    });
});

app.post('/upload', upload.single('sharex'), async function(req, res) {
    let fileId = await backend.makeId(config.fileNameLength);
    let secret = req?.headers?.secret;
    secret = secret?.replaceAll('`', '');
    secret = secret?.replaceAll('"', '');
    secret = secret?.replaceAll(`\'`, ``);
    let userid = req?.headers?.userid;
    userid = userid?.replaceAll('`', '');
    userid = userid?.replaceAll('"', '');
    userid = userid?.replaceAll(`\'`, ``);
    if(!secret) return res.send('No secret provided in header params of ShareX!');
    if(!userid) return res.send('No userid provided in header params of ShareX!');
    await con.query(`SELECT * FROM users WHERE secret="${secret}" AND userid="${userid}"`, async (err, row) => {
        if(err) throw err;
        let webURL = row[0]?.webhook;
        if(!row[0]) {
            let json_ = {
                status: "UNAUTHORIZED",
                errormsg: "You did not provide a valid secret or userid!",
                url: `[ShareX] Upload failed...`
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        }
        let user = row[0];
        let notExceeding = await backend.dirSize(`./public/u/${user.folder}`, { returnFinal: false });
        if(!notExceeding) {
            let json_ = {
                status: "FOLDER SIZE EXCEEDED",
                errormsg: "Folder size limit reached. This is configurable in the config file if you are the owner of this service.",
                url: `[ShareX] Upload failed, your folder limit has been reached! Please delete some images to make more space!`
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
        let file = req.files.sharex;
        if(file) {
            let nameExt = file.name.substr(file.name.lastIndexOf('.') + 1);
            fs.writeFileSync(`${path.dirname(require.main.filename)}/public/u/${user.folder}/${fileId}.${nameExt}`, file.data);
            let json_ = {
                status: "OK",
                errormsg: "",
                url: `${d}u/${user.folder}/${fileId}.${nameExt}`
            };
            res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
            await backend.webhook({ userid: userid, link: `${d}u/${user.folder}/${fileId}.${nameExt}`, webhook: webURL });
            await con.query(`INSERT INTO images (userid, fileid, filename) VALUES ("${userid}", "${fileId}", "${fileId}.${nameExt}")`, async (err, row) => {
                if(err) throw err;
            });
        } else {
            res.send('No post data recieved')
            if(config.debugmode) console.log('No post data recieved');
        };
    });
});

app.get('/backend/config/download/:userid/:secret', async function(req, res) {
    let userid = req?.params?.userid
    let secret = req?.params?.secret
    let configjson = {
        
            "Version": "14.1.0",
            "Name": "FreeCDN",
            "DestinationType": "ImageUploader, FileUploader",
            "RequestMethod": "POST",
            "RequestURL": `${config.domain}/upload`,
            "Body": "MultipartFormData",
            "Arguments": {
              "userid": userid,
              "secret": secret
            },
            "FileFormName": "sharex",
            "URL": "{json:url}"
        }
    
    fs.writeFileSync(`./public/u/FreeCDN.sxcu`, JSON.stringify(configjson));
    await res.download(`./public/u/FreeCDN.sxcu`, 'FreeCDN.sxcu')
    setTimeout(() => {
        fs.unlink('./public/u/FreeCDN.sxcu', function (err) {
            if (err) throw err;
        });    
    }, 5000);
});

app.get('/upload/file', async function(req, res) {
    let loggedIn = await backend.loggedIn(req);
    res.render('upload', { backend: backend, config: config, con: con, loggedIn: loggedIn })
});

app.post('/upload/file', async function(req, res) {
    if (!req?.cookies?.connect) return res.redirect('/');
    let user;
    await con.query(`SELECT * FROM users WHERE cookie="${req?.cookies?.connect}"`, async (err, row) => {
        if(!row[0]) return;
        user = row[0]
        let characters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '1', '0', '2', '3', '4', '5', '6', '7', '8', '9', '-', '_']
        let keyGenerator = function() {
            let key = "";
            for (let i = 0; i < 10; i++) {
                key += `${characters[Math.floor(Math.random() * characters.length)]}`;
            };
            return key;
        };
        try {
            if(!req.files) {
                res.status(400).send({
                    status: 400,
                    message: 'No file uploaded'
                });
            } else {
                if (!req.body.password){
                    req.body.password = null
                }
                let file = req.files.file;
                let key = await keyGenerator();
                let name = `${key}-${file.name.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")}`
                if(!fs.existsSync(`./downloads/${user.folder}`)) {
                    fs.mkdirSync(`./downloads/${user.folder}`, { recursive: true });
                };
                await file.mv(`./downloads/${user.folder}/${name}`);
                await con.query(`SELECT * FROM downloads WHERE user="${user.folder}"`, async function(err, sql){
                    let id = sql.length + 1;
                    if (req.body.password !== null) {
                        await bcrypt.hash(req.body.password, 10, async (err, hash) => {
                            await con.query(`INSERT INTO downloads (id, user, url, amount, name, password) VALUE  ('${id}', '${user.folder}', '${name}', '0', '${file.name.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")}', '${hash}')`, async (err, row) => {
                                if(err) throw err;
                            });
                        });
                    } else {
                        await con.query(`INSERT INTO downloads (id, user, url, amount, name) VALUE  ('${id}', '${user.folder}', '${name}', '0', '${file.name.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")}')`, async (err, row) => {
                            if(err) throw err;
                        });
                    };
                });
                return res.redirect('/');
            }
        } catch (err) {
            throw err;
        }
    });
});

app.get('/download/:folder/:url', async (req, res) => {
    let loggedIn = await backend.loggedIn(req);
    let url = req.params.url.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")
    let folder = req.params.folder.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")

    await con.query(`SELECT * FROM downloads WHERE url='${url}'`, function(err, sql){
        if (err) throw err
        if (!sql[0]) return res.redirect('/dashboard')
        if (sql[0].password) {
            res.render('pass', { backend: backend, config: config, con: con, loggedIn: loggedIn,  name: sql[0].name, id: url, folder: folder, msg: "" })
        } else {
            let num = sql[0].amount + 1;
            con.query(`UPDATE downloads SET amount = '${num}' WHERE id=('${sql[0].id}')`, async (err, row) => {
                if(err) throw err;
            });
            res.download(`./downloads/${folder}/${url}`, sql[0].name)
        }
    });
});

app.post('/pass/download/:folder/:url', async (req, res) => {
    let url = req.body.id.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")
    let folder = req.body.folder.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")
    await con.query(`SELECT * FROM downloads WHERE  url='${url}'`, function(err, sql){
        if (err) throw err
        if (!sql[0]) return res.redirect('/');
        if (sql[0].password) {
            bcrypt.compare(req.body.password, sql[0].password, async function(error, response) {
                // response == true if they match
                // response == false if password is wrong
                if (response == false) {
                    let loggedIn = await backend.loggedIn(req);
                    let url = req.params.url.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")
                    let folder = req.params.folder.replaceAll('"', '').replaceAll('`', '').replaceAll("'", "")
                    await con.query(`SELECT * FROM downloads WHERE url='${url}'`, function(err, sql){
                        if (err) throw err
                        res.render('pass', { backend: backend, config: config, con: con, loggedIn: loggedIn, name: sql[0].name, id: url, folder: folder, msg: "Invalid password provided..." })
                    });
                } else {
                    let num = sql[0].amount + 1;
                    con.query(`UPDATE downloads SET amount = '${num}' WHERE id=('${sql[0].id}')`, async (err, row) => {
                        if(err) throw err;
                    });
                    res.download(`./downloads/${folder}/${url}`, sql[0].name)
                };
            });
        };
    });
});

app.get('/logout', async (req, res) => {
    res.clearCookie('connect')
    await con.query(`SELECT * FROM images`, async (err, row) => {
        if(err) throw err;
        let c = row.length || 0;
        await con.query(`SELECT * FROM users`, async (err, row) => {
            if(err) throw err;
            let u = row.length || 0;
            await con.query(`SELECT * FROM downloads`, async (err, row) => {
                if(err) throw err;
                let d = row.length || 0;
                res.render('index.ejs', { backend: backend, config: config, con: con, count: c, users: u, loggedIn: false, downloads: d})
            });
        });
    });
});

app.get('/login', passport.authenticate('discord'), (req, res) => {
    res.sendStatus(200)
});

app.get('/auth/discord/callback', passport.authenticate('discord'), async (req, res) => {
    let length = 28;
    let cookie           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        cookie += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    res.clearCookie("connect");
    res.cookie('connect', cookie, { maxAge: 90000000, httpOnly: true });
    await con.query(`SELECT * FROM users WHERE userid='${req.session.passport.user.userid}'`, async (err, row) => {
        if(err) throw err;
        let folderName = row[0]?.folder || req.session.passport.user.userid;
        if(!row[0]) {
            let secret = await backend.makeId(12);
            await con.query(`INSERT INTO users (userid, secret, folder, webhook, cookie, admin) VALUES ("${req.session.passport.user.userid}", "${secret}", "${req.session.passport.user.userid}", "none", "${cookie}", false)`, async (err, row) => {
                if(err) throw err;
            });
            await fs.mkdirSync(`./public/u/${folderName}`, { recursive: true });
        } else {
            await con.query(`UPDATE users SET cookie="${cookie}" WHERE userid='${req.session.passport.user.userid}'`, async (err, row) => {
                if(err) throw err;
                res.redirect('/')
            });
        };
    });
});

app.get('/backend/secret/reset/:userid', async function(req, res) {
    let loggedIn = await backend.loggedIn(req);
    if(loggedIn) {
        let cookie = req?.cookies?.connect;
        await con.query(`SELECT * FROM users WHERE cookie="${cookie}"`, async (err, row) => {
            if(err) throw err;
            let user = row[0];
            if(req.params.userid == user.userid) {
                let secret = await backend.makeId(12);
                await con.query(`UPDATE users SET secret="${secret}" WHERE userid="${user.userid}"`, async function(err, row) {
                    if(err) throw err;
                });
                return res.redirect('/backend/folderfind');
            } else {
                return res.redirect('/backend/folderfind');
            };
        });
    } else {
        return res.redirect('/');
    };
});

app.post('/backend/update/folder/:userid', async function(req, res) {
    let loggedIn = await backend.loggedIn(req);
    if(loggedIn) {
        let cookie = req?.cookies?.connect;
        await con.query(`SELECT * FROM users WHERE cookie="${cookie}"`, async (err, row) => {
            if(err) throw err;
            let user = row[0];
            if(req.params.userid == user.userid) {
                if(!req.body.input) return res.redirect('/backend/folderfind');
                req.body.input = req.body.input.replaceAll(" ", "").replaceAll("`", "").toLowerCase();
                for(let char of forbidden) {
                    req.body.input = req.body.input.replaceAll(`${char}`, ``)
                };
                if(fs.existsSync(`./public/u/${req.body.input}`)) {
                    res.render('error.ejs', { config: config, error: `Folder already exists...` })
                };
                fs.renameSync(`./public/u/${user.folder}`, `./public/u/${req.body.input}`);
                await con.query(`UPDATE users SET folder="${req.body.input}" WHERE userid="${user.userid}"`, async function(err, row) {
                    if(err) throw err;
                });
                return res.redirect('/backend/folderfind');
            } else {
                return res.redirect('/backend/folderfind');
            };
        });
    } else {
        return res.redirect('/');
    };
});

app.post('/backend/update/webhook/:userid', async function(req, res) {
    let loggedIn = await backend.loggedIn(req);
    if(loggedIn) {
        let cookie = req?.cookies?.connect;
        await con.query(`SELECT * FROM users WHERE cookie="${cookie}"`, async (err, row) => {
            if(err) throw err;
            let user = row[0];
            if(req.params.userid == user.userid) {
                if(!req?.body?.input) req.body.input = 'none';
                req.body.input = req.body.input.replaceAll("`", "").replaceAll("'", "").replaceAll('"', '');
                await con.query(`UPDATE users SET webhook="${req.body.input || 'none'}" WHERE userid="${user.userid}"`, async function(err, row) {
                    if(err) throw err;
                });
                return res.redirect('/backend/folderfind');
            } else {
                return res.redirect('/backend/folderfind');
            };
        });
    } else {
        return res.redirect('/');
    };
});

app.get('/backend/check/:image', async (req, res) => {
    let image = req?.body?.image;
    image = image?.replaceAll('`', '');
    image = image?.replaceAll('"', '');
    image = image?.replaceAll(`\'`, ``);
    await con.query(`SELECT * FROM images WHERE filename="${image}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            let json_ = {
                status: 200
            };
            res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        } else {
            let json_ = {
                status: 404
            };
            res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
    });
});

app.get('/backend/folderfind', async (req, res) => {
    let cookie = req?.cookies?.connect;
    await con.query(`SELECT * FROM users WHERE cookie="${cookie}"`, async (err, row) => {
        if(err) throw err;
        if(!row[0]) return res.redirect('/');
        let folderName = row[0]?.folder
        res.redirect(`${d}${folderName}`)
    });
});

app.get('/backend/delete/:userid/:filename', async (req, res) => {
    let cookie = req?.cookies?.connect;
    if(!cookie) return res.redirect('/');
    if(!req.params.userid) return res.redirect('/');
    if(!req.params.filename) return res.redirect('/');
    await con.query(`SELECT * FROM users WHERE cookie="${cookie}"`, async (err, row) => {
        if(err) throw err;
        if(!row[0]) return res.redirect('/');
        let user = row[0];
        await con.query(`DELETE FROM images WHERE userid='${req.params.userid}' AND filename='${req.params.filename}'`, async (err, row) => {
            if(err) throw err;
            unlinkSync(`./public/u/${user.folder}/${req.params.filename}`);
        });
        res.redirect(`/backend/folderfind`);
    });
});

app.get('/:folder/:item', async function (req, res) {
    let folder = req.params.folder
    let item = req.params.item;
    if(fs.existsSync(`./public/u/${folder}/${item}`)) {
        res.sendFile(`./public/u/${folder}/${item}`, {root: __dirname})
    } else {
        res.redirect('/404')
    }
});

app.get('/:folder', async function (req, res) {
    let loggedIn = await backend.loggedIn(req);
    let folder = req.params.folder
    let cookie = req?.cookies?.connect;
    let isMyFolder;
    if(fs.existsSync(`./public/u/${folder}`)) {
        if(loggedIn) {
            await con.query(`SELECT * FROM users WHERE cookie="${cookie}" AND folder="${folder}"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    isMyFolder = true;
                } else {
                    isMyFolder = false;
                };
            });
        };
        await con.query(`SELECT * FROM users WHERE folder='${folder}'`, async (err, row) => {
            await con.query(`SELECT * FROM downloads WHERE user='${folder}'`, async (err, sql) => {
            if(err) throw err;
            if(!row[0]) return res.redirect('/404');
            let usercon = row[0];
            let u = await backend.fetchUser(row[0].userid);
            await con.query(`SELECT * FROM images WHERE userid='${row[0].userid}'`, async (err, images) => {
                if(err) throw err;
                let bruh = images.length || 0;
                let usedUp = await backend.dirSize(`./public/u/${folder}`, { returnFinal: true });
                let hmmm = await backend.dirSize(`./public/u/${folder}`, { returnFinal: false });
                let f = `u/${folder}/`
                res.render('folder.ejs', { backend: backend, config: config, con: con, secret: usercon.secret, count: bruh, user: u, currentUsed: usedUp, notExceeding: hmmm, loggedIn: loggedIn, images: images.reverse(), isMyFolder: isMyFolder, folder: f, webhook: usercon.webhook, sql: sql, folder: folder })
            });
        });
        });
    } else {
        res.redirect('/')
    };
});

// MAKE SURE THIS IS LAST FOR 404 PAGE REDIRECT
app.get('*', function(req, res){
    res.render('404.ejs', { backend: backend, config: config, con: con });
});

// Main Logger Event
logger.hypelogger(`FreeCDN`, '500', 'magenta', `Domain: ${chalk.magenta(config.domain)}\nPort: ${chalk.magenta(config.port)}\n\nAuthor: ${chalk.magenta('Standard Software Systems')}`, 'disabled', 'magenta', 'single', true)

// Port Listening
app.listen(config.port)

process.on('unhandledRejection', function(err) { 
    let ref = err.toString().toLowerCase();
    if(ref.includes('unlink')) return;
    console.log(chalk.red(`\nFATAL ERROR: \n\n`, err.stack))
});
