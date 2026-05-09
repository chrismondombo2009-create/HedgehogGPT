"use strict";

async function getUsername(uid, api, usersData) {
    try {
        if (usersData && typeof usersData.getName === 'function') {
            const localName = await usersData.getName(uid);
            if (localName && 
                localName !== uid && 
                localName !== "Facebook User" && 
                localName !== "Utilisateur" &&
                localName !== "User" && 
                !localName.startsWith("User_") &&
                localName.length > 1) {
                return localName;
            }
        }
    } catch (e) {
        console.warn(`⚠️ Erreur usersData.getName pour ${uid}:`, e.message);
    }

    // 2. Fallback sur l'API Facebook
    try {
        const info = await api.getUserInfo(uid);
        const name = info?.name || info?.[uid]?.name;
        if (name && 
            name !== uid && 
            name !== "Facebook User" && 
            name !== "Utilisateur" && 
            !name.startsWith("User_")) {
            return name;
        }
    } catch (e) {
        console.warn(`⚠️ Erreur api.getUserInfo pour ${uid}:`, e.message);
    }
    return `User_${String(uid).slice(-5)}`;
}

module.exports = { getUsername };