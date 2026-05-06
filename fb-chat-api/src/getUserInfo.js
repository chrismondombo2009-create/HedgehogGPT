"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
    return async function getUserInfo(userID) {
        if (!userID) {
            throw new Error("No user ID provided");
        }

        // Normalisation : on accepte un seul ID ou un tableau d'IDs
        const isMultiple = Array.isArray(userID);
        const ids = isMultiple ? userID : [userID];

        // --- Étape 1 : essayer l'API Facebook (batch) ---
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

        // --- Étape 2 : compléter avec la base locale usersData ---
        const resultObj = {};
        for (const id of ids) {
            // Si l'API Facebook a renvoyé un nom valide, on le garde
            if (graphResult[id] && graphResult[id].name && graphResult[id].name !== "Facebook User") {
                resultObj[id] = graphResult[id];
                continue;
            }

            // Sinon, on essaie de récupérer le nom depuis usersData
            let localName = null;
            try {
                // On accède à usersData via l'objet global (disponible dans tout le processus du bot)
                const usersData = global.GoatBot?.usersData || global.usersData;
                if (usersData) {
                    localName = await usersData.getName(id);
                }
            } catch (e) {}

            // Construction de l'objet final avec le nom trouvé (local ou fallback)
            resultObj[id] = {
                id: id,
                name: localName || "Facebook User",
                firstName: "Facebook",
                thumbSrc: `https://graph.facebook.com/${id}/picture?width=100&height=100`,
                ...(graphResult[id] || {})
            };
            // On remplace le nom si on avait un résultat partiel
            if (localName) {
                resultObj[id].name = localName;
            }
        }

        return isMultiple ? resultObj : resultObj[userID];
    };
};