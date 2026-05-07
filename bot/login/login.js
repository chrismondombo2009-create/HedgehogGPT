// set bash title
process.stdout.write("\x1b]2;Hedgehog Bot V2 - Fixed by Ismael04-lag\x1b\x5c");
const defaultRequire = require;

function decode(text) {
    text = Buffer.from(text, 'hex').toString('utf-8');
    text = Buffer.from(text, 'hex').toString('utf-8');
    text = Buffer.from(text, 'base64').toString('utf-8');
    return text;
}

const gradient = defaultRequire("gradient-string");
const axios = defaultRequire("axios");
const path = defaultRequire("path");
const readline = defaultRequire("readline");
const fs = defaultRequire("fs-extra");
const toptp = defaultRequire("totp-generator");
const login = defaultRequire(`${process.cwd()}/fb-chat-api`);
const https = defaultRequire("https");
const { writeFileSync, readFileSync, existsSync, watch } = require("fs-extra");

let qr = null;
let Canvas = null;
try {
    qr = new (defaultRequire("qrcode-reader"));
    Canvas = defaultRequire("canvas");
} catch (e) {
    console.warn("⚠️ QR code reader disabled (canvas not available)");
}

async function getName(userID) {
    try {
        const user = await axios.post(`https://www.facebook.com/api/graphql/?q=${`node(${userID}){name}`}`);
        return user.data[userID].name;
    } catch (error) {
        return null;
    }
}

function compareVersion(version1, version2) {
    const v1 = version1.split(".");
    const v2 = version2.split(".");
    for (let i = 0; i < 3; i++) {
        if (parseInt(v1[i]) > parseInt(v2[i])) return 1;
        if (parseInt(v1[i]) < parseInt(v2[i])) return -1;
    }
    return 0;
}

const handlerWhenListenHasError = require("./handlerWhenListenHasError.js");
const checkLiveCookie = require("./checkLiveCookie.js");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function centerText(text, length) {
    const width = process.stdout.columns;
    const leftPadding = Math.floor((width - (length || text.length)) / 2);
    const rightPadding = width - leftPadding - (length || text.length);
    const paddedString = ' '.repeat(leftPadding > 0 ? leftPadding : 0) + text + ' '.repeat(rightPadding > 0 ? rightPadding : 0);
    console.log(paddedString);
}

function createLine(content, isMaxWidth = false) {
    const widthConsole = process.stdout.columns > 50 ? 50 : process.stdout.columns;
    if (!content)
        return Array(isMaxWidth ? process.stdout.columns : widthConsole).fill("─").join("");
    else {
        content = ` ${content.trim()} `;
        const lengthContent = content.length;
        const lengthLine = isMaxWidth ? process.stdout.columns - lengthContent : widthConsole - lengthContent;
        let left = Math.floor(lengthLine / 2);
        if (left < 0 || isNaN(left)) left = 0;
        const lineOne = Array(left).fill("─").join("");
        return lineOne + content + lineOne;
    }
}

const currentVersion = require(`${process.cwd()}/package.json`).version;
console.log(gradient("#f5af19", "#f12711")(createLine(null, true)));
console.log();
centerText(gradient("#FA8BFF", "#2BD2FF", "#2BFF88")("HEDGEHOG BOT V2"), "HEDGEHOG BOT V2".length);
centerText(gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(`Version ${currentVersion}`), `Version ${currentVersion}`.length);
centerText(gradient("#9F98E8", "#AFF6CF")("Created by ʚʆɞ Ismaël ʚʆɞ"), "Created by ʚʆɞ Ismaël ʚʆɞ".length);
centerText(gradient("#9F98E8", "#AFF6CF")("Source code: https://github.com/Ismael04-lag/HedgehogGPT"), "Source code: https://github.com/Ismael04-lag/HedgehogGPT".length);
console.log(gradient("#f5af19", "#f12711")(createLine()));
async function readQrCode(filePath) {
    if (!qr || !Canvas) throw new Error("QR code reading not available");
    const image = await Canvas.loadImage(filePath);
    const canvas = Canvas.createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, image.width, image.height);
    let value;
    qr.callback = function (error, result) {
        if (error) throw error;
        value = result;
    };
    qr.decode(data);
    return value.result;
}

function filterKeysAppState(appState) {
    return appState.filter(item => ["c_user", "xs", "datr", "fr", "sb", "i_user"].includes(item.key));
}

function netScapeToCookies(cookieData) {
    const cookies = [];
    const lines = cookieData.split('\n');
    lines.forEach((line) => {
        if (line.trim().startsWith('#')) return;
        const fields = line.split('\t').map((field) => field.trim()).filter((field) => field.length > 0);
        if (fields.length < 7) return;
        const cookie = {
            key: fields[5],
            value: fields[6],
            domain: fields[0],
            path: fields[2],
            hostOnly: fields[1] === 'TRUE',
            creation: new Date(fields[4] * 1000).toISOString(),
            lastAccessed: new Date().toISOString()
        };
        cookies.push(cookie);
    });
    return cookies;
}

function pushI_user(appState, value) {
    appState.push({
        key: "i_user",
        value: value,
        domain: "facebook.com",
        path: "/",
        hostOnly: false,
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
    });
    return appState;
}

async function getAppStateFromEmail(spin, facebookAccount) {
    const { email, password, userAgent, proxy } = facebookAccount;
    const getFbstate = require("./getFbstate.js");
    let code2FATemp;
    let appState;
    try {
        appState = await getFbstate(email, password, userAgent, proxy);
        spin._stop();
    } catch (err) {
        if (err.continue) {
            let tryNumber = 0;
            let isExit = false;
            await (async function submitCode(message) {
                if (message && isExit) {
                    spin._stop();
                    console.error(message);
                    process.exit();
                }
                if (message) {
                    spin._stop();
                    console.warn(message);
                }
                if (facebookAccount["2FASecret"] && tryNumber == 0) {
                    const isImage = ['.png', '.jpg', '.jpeg'].some(i => facebookAccount["2FASecret"].endsWith(i));
                    if (isImage && qr && Canvas) {
                        code2FATemp = (await readQrCode(`${process.cwd()}/${facebookAccount["2FASecret"]}`)).replace(/.*secret=(.*)&digits.*/g, '$1');
                    } else {
                        code2FATemp = facebookAccount["2FASecret"];
                    }
                } else {
                    spin._stop();
                    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                    code2FATemp = await new Promise(resolve => rl.question("> Enter 2FA code or secret: ", ans => { rl.close(); resolve(ans); }));
                }
                const code2FA = isNaN(code2FATemp) ?
                    toptp(code2FATemp.normalize("NFD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[đ|Đ]/g, (x) => x == "đ" ? "d" : "D").replace(/\(|\)|\,/g, "").replace(/ /g, "")) :
                    code2FATemp;
                spin._start();
                try {
                    appState = JSON.parse(JSON.stringify(await err.continue(code2FA)));
                    appState = appState.map(item => ({ key: item.key, value: item.value, domain: item.domain, path: item.path, hostOnly: item.hostOnly, creation: item.creation, lastAccessed: item.lastAccessed })).filter(item => item.key);
                    spin._stop();
                } catch (err2) {
                    tryNumber++;
                    if (!err2.continue) isExit = true;
                    await submitCode(err2.message);
                }
            })(err.message);
        } else throw err;
    }
    global.GoatBot.config.facebookAccount['2FASecret'] = code2FATemp || "";
    writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
    return appState;
}

async function getAppStateToLogin(loginWithEmail, spin, facebookAccount, dirAccount) {
    let appState = [];
    if (loginWithEmail) return await getAppStateFromEmail(spin, facebookAccount);
    if (!existsSync(dirAccount)) throw new Error(`Account file not found: ${dirAccount}`);
    const accountText = readFileSync(dirAccount, "utf8");
    try {
        if (accountText.startsWith('EAAAA')) {
            const getFbstateToken = require("./getFbstate.js");
            appState = await getFbstateToken(accountText);
        } else if (accountText.match(/^(?:\s*\w+\s*=\s*[^;]*;?)+/)) {
            appState = accountText.split(';').map(i => {
                const [key, value] = i.split('=');
                return { key: (key || "").trim(), value: (value || "").trim(), domain: "facebook.com", path: "/", hostOnly: true, creation: new Date().toISOString(), lastAccessed: new Date().toISOString() };
            }).filter(i => i.key && i.value && i.key != "x-referer");
        } else if (/^# Netscape HTTP Cookie File/.test(accountText)) {
            appState = netScapeToCookies(accountText);
        } else if (/^\s*\[/.test(accountText)) {
            appState = JSON.parse(accountText);
            if (appState.some(i => i.name)) appState = appState.map(i => { i.key = i.name; delete i.name; return i; });
            appState = appState.filter(i => i.key && i.value && i.key != "x-referer").map(i => ({ ...i, domain: "facebook.com", path: "/", hostOnly: false, creation: new Date().toISOString(), lastAccessed: new Date().toISOString() }));
        } else {
            throw new Error("Invalid account format");
        }
    } catch (err) {
        spin._stop();
        throw err;
    }
    return appState;
}

async function startBot(loginWithEmail) {
  
    while (!global.GoatBot || !global.utils || !global.client) {
        await sleep(100);
    }

    const { callbackListenTime, storage5Message } = global.GoatBot;
    const { log, logColor, getPrefix, createOraDots, jsonStringifyColor, getText, convertTime, colors, randomString } = global.utils;
    const { dirAccount } = global.client;
    const { facebookAccount } = global.GoatBot.config;
    const currentVersion = require(`${process.cwd()}/package.json`).version;

    let tooOldVersion = "0.0.0";
    try {
        tooOldVersion = (await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Storage/main/tooOldVersions.txt")).data || "0.0.0";
    } catch (e) {
        log.warn("VERSION", "Cannot check version, continue...");
    }
    if ([-1, 0].includes(compareVersion(currentVersion, tooOldVersion))) {
        log.err("VERSION", getText('version', 'tooOldVersion', colors.yellowBright('node update')));
        process.exit();
    }

    if (global.GoatBot.Listening) {
        if (global.GoatBot.stopListening) await global.GoatBot.stopListening();
    }

    log.info("LOGIN FACEBOOK", getText('login', 'currentlyLogged'));

    let spin = createOraDots("Login...");
    spin._start();
    let appState = await getAppStateToLogin(loginWithEmail, spin, facebookAccount, dirAccount);
    global.changeFbStateByCode = true;
    appState = filterKeysAppState(appState);
    writeFileSync(dirAccount, JSON.stringify(appState, null, 2));
    setTimeout(() => global.changeFbStateByCode = false, 1000);

    (function loginBot(appState) {
        global.GoatBot.commands = new Map();
        global.GoatBot.eventCommands = new Map();
        global.GoatBot.aliases = new Map();
        global.GoatBot.onChat = [];
        global.GoatBot.onEvent = [];
        global.GoatBot.onReply = new Map();
        global.GoatBot.onReaction = new Map();
        clearInterval(global.intervalRestartListenMqtt);
        delete global.intervalRestartListenMqtt;

        if (facebookAccount.i_user) pushI_user(appState, facebookAccount.i_user);

        let isSendNotiErrorMessage = false;

        login({ appState }, global.GoatBot.config.optionsFca || {}, async function (error, api) {
            spin._stop();
            if (error) {
                log.err("LOGIN FACEBOOK", getText('login', 'loginError'), error);
                global.statusAccountBot = "can't login";
                if (facebookAccount.email && facebookAccount.password) return startBot(true);
                process.exit(1);
            }

            global.GoatBot.fcaApi = api;
            global.GoatBot.botID = api.getCurrentUserID();

            log.info("LOGIN FACEBOOK", getText('login', 'loginSuccess'));
            global.botID = api.getCurrentUserID();

            const { threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, sequelize } = await require("./loadData.js")(api);

            log.info("LOADING", "Loading commands...");
            const cmdsPath = path.join(process.cwd(), "scripts", "cmds");
            if (fs.existsSync(cmdsPath)) {
                const commandFiles = fs.readdirSync(cmdsPath).filter(file => file.endsWith(".js") && !file.endsWith(".eg.js"));
                for (const file of commandFiles) {
                    try {
                        const command = require(path.join(cmdsPath, file));
                        const name = command.config.name;
                        global.GoatBot.commands.set(name, command);
                        if (command.config.aliases) {
                            for (const alias of command.config.aliases) {
                                global.GoatBot.aliases.set(alias, name);
                            }
                        }
                        log.info("CMD", `Loaded ${name}`);
                    } catch (err) {
                        log.err("CMD", `Error loading ${file}`, err);
                    }
                }
            }

            log.info("LOADING", "Loading events...");
            const eventsPath = path.join(process.cwd(), "scripts", "events");
            if (fs.existsSync(eventsPath)) {
                const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js") && !file.endsWith(".eg.js"));
                for (const file of eventFiles) {
                    try {
                        const event = require(path.join(eventsPath, file));
                        const name = event.config.name;
                        global.GoatBot.eventCommands.set(name, event);
                        log.info("EVENT", `Loaded ${name}`);
                    } catch (err) {
                        log.err("EVENT", `Error loading ${file}`, err);
                    }
                }
            }

            
            const handlerEvents = require("./handlerEvents.js")(api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
            global.GoatBot.Listening = api.listenMqtt(async (error, event) => {
                if (error) {
                    log.err("LISTEN_MQTT", error);
                    return;
                }
                try {
                    const message = {
                        ...event,
                        reply: (body, cb) => api.sendMessage(body, event.threadID, cb, event.messageID)
                    };
                    await handlerEvents(event, message);
                } catch (err) {
                    log.err("HANDLER", err);
                }
            });

            log.info("BOT", "Hedgehog Bot V2 is now listening");
            logColor("#f5af19", createLine("BOT STARTED SUCCESSFULLY"));
        });
    })(appState);
}

global.GoatBot = global.GoatBot || {};
global.GoatBot.reLoginBot = startBot;
startBot();