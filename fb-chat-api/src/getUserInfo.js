"use strict";

module.exports = function (defaultFuncs, api, ctx) {
    // Amélioration 1: Accepter un tableau d'IDs pour faire une requête groupée
    return async function getUserInfo(userIDs) {
        if (!userIDs || (Array.isArray(userIDs) && userIDs.length === 0)) {
            return Promise.reject(new Error("No user IDs provided"));
        }

        const inputIsArray = Array.isArray(userIDs);
        const ids = inputIsArray ? userIDs : [userIDs];

        // Amélioration 2: Utiliser le batch API de Facebook pour obtenir toutes les infos en une fois
        const requests = ids.map(id => ({
            method: "GET",
            relative_url: `${encodeURIComponent(id)}?fields=id,name,firstName,lastname,thumbSrc,profileUrl,isFriend,isBirthday`
        }));

        try {
            // Amélioration 3: Échapper correctement la requête batch et gérer le token
            const token = ctx.access_token || process.env.FB_API_KEY || "";
            const form = {
                batch: JSON.stringify(requests),
                include_headers: false,
                access_token: token || undefined
            };
            
            // Amélioration 4: Utiliser l'API graph.facebook.com standard
            const res = await defaultFuncs
                .post("https://graph.facebook.com/v18.0/", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

            if (!res || res.error) {
                throw res;
            }

            // Amélioration 5: Formater la réponse pour correspondre à l'attendu du bot
            const resultObj = {};
            res.forEach((data, index) => {
                if (data && data.code === 200) {
                    const userData = JSON.parse(data.body);
                    resultObj[ids[index]] = userData;
                }
            });

            return inputIsArray ? resultObj : resultObj[userIDs];
        } catch (err) {
            // Fallback si la requête batch échoue
            if (inputIsArray) {
                const resultObj = {};
                ids.forEach(id => {
                    resultObj[id] = {
                        id: id,
                        name: "Facebook User",
                        firstName: "Facebook",
                        thumbSrc: `https://graph.facebook.com/${id}/picture?width=100&height=100`
                    };
                });
                return resultObj;
            }
            return {
                [userIDs]: {
                    id: userIDs,
                    name: "Facebook User",
                    firstName: "Facebook",
                    thumbSrc: `https://graph.facebook.com/${userIDs}/picture?width=100&height=100`
                }
            };
        }
    };
};