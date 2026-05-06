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

        // --- 1. Essayer l’API Facebook (batch) ---
        let graphResult = {};
        try {
            const requests = ids.map(id => ({
                method: "GET",
                relative_url: `${encodeURIComponent(id)}?fields=id,name,firstName,lastName,thumbSrc,profileUrl,isFriend,isBirthday`
            }));

            const form = {
                batch: JSON.stringify(requests),
                include_headers: false
            };

            const res = await defaultFuncs
                .post("https://graph.facebook.com/v18.0/", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

            if (res && !res.error) {
                res.forEach((data, index) => {
                    if (data && data.code === 200) {
                        try {
                            graphResult[ids[index]] = JSON.parse(data.body);
                        } catch (e) {
                            graphResult[ids[index]] = {};
                        }
                    }
                });
            }
        } catch (err) {
            log.warn("getUserInfo", "Facebook batch request failed, will use local cache.");
        }

        // --- 2. Compléter avec la base locale usersData ---
        const resultObj = {};
        for (const id of ids) {
            const fbData = graphResult[id] || {};
            let name = fbData.name;

            // Si le nom Facebook est absent ou semble être un ID, on utilise usersData
            if (!name || name === id || name === "Facebook User") {
                let localName = null;
                try {
                    const usersData = global.GoatBot?.usersData || global.usersData;
                    if (usersData) {
                        localName = await usersData.getName(id);
                    }
                } catch (e) {}

                // On ne garde que si localName est un vrai nom (pas un ID)
                if (localName && localName !== id) {
                    name = localName;
                } else {
                    name = "Facebook User";
                }
            }

            resultObj[id] = {
                ...fbData,
                id: id,
                name: name,
                thumbSrc: fbData.thumbSrc || `https://graph.facebook.com/${id}/picture?width=100&height=100`
            };
        }

        return isMultiple ? resultObj : resultObj[userID];
    };
};