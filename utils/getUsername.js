"use strict";

async function getUsername(uid, api, usersData) {
    try {
        const info = await api.getUserInfo(uid);
        const name = info?.name || info?.[uid]?.name;
        if (name && name !== uid && name !== "Facebook User" &&
            name !== "Utilisateur" && !name.startsWith("User_")) {
            return name;
        }
    } catch (e) {}

    try {
        if (usersData) {
            const localName = await usersData.getName(uid);
            if (localName && localName !== uid &&
                localName !== "Facebook User" && localName !== "Utilisateur") {
                return localName;
            }
        }
    } catch (e) {}

    return `User_${String(uid).slice(-5)}`;
}

module.exports = { getUsername };