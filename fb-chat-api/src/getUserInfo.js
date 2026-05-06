"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
    return async function getUserInfo(userID) {
        if (!userID) {
            throw new Error("No user ID provided");
        }

        const isMultiple = Array.isArray(userID);
        const ids = isMultiple ? userID : [userID];

        // --- 1. Essayer via le endpoint interne Messenger (plus fiable que Graph API) ---
        let messengerResult = {};
        try {
            const form = {
                ids: ids.join(","),
            };

            const res = await defaultFuncs
                .post(
                    "https://www.facebook.com/chat/user_info/",
                    ctx.jar,
                    form
                )
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

            if (res && res.payload && res.payload.profiles) {
                const profiles = res.payload.profiles;
                for (const id of ids) {
                    if (profiles[id]) {
                        const p = profiles[id];
                        messengerResult[id] = {
                            name: p.name || p.firstName || null,
                            firstName: p.firstName || null,
                            thumbSrc: p.thumbSrc || p.uri || null,
                            profileUrl: p.href || null,
                            type: p.type || null,
                        };
                    }
                }
            }
        } catch (err) {
            log.warn("getUserInfo", "Messenger user_info request failed: " + err.message);
        }

        // --- 2. Fallback : base locale usersData ---
        const resultObj = {};
        for (const id of ids) {
            const mData = messengerResult[id] || {};
            let name = mData.name;

            if (!name || name === id) {
                try {
                    const usersData = global.GoatBot?.usersData || global.usersData;
                    if (usersData) {
                        const localName = await usersData.getName(id);
                        if (localName && localName !== id) {
                            name = localName;
                        }
                    }
                } catch (e) {}
            }

            // Dernier recours : ID tronqué plutôt que "Facebook User"
            if (!name || name === id) {
                name = `User_${String(id).slice(-5)}`;
            }

            resultObj[id] = {
                ...mData,
                id: id,
                name: name,
                thumbSrc:
                    mData.thumbSrc ||
                    `https://graph.facebook.com/${id}/picture?width=100&height=100`,
            };
        }

        return isMultiple ? resultObj : resultObj[userID];
    };
};