"use strict";

const fs = require("fs");
const path = require("path");

const CMDS_DIR = "./scripts/cmds";
const IMPORT_LINE = `const { getUsername, toBold } = require("../../utils/getUsername.js");\n`;

// ─── Patterns de noms fallback à détecter ───────────────────────────────────
const BAD_FALLBACKS = [
    /\|\|\s*["']Utilisateur["']/,
    /\|\|\s*["']Facebook User["']/,
    /\|\|\s*["']Facebook["']/,
    /usersData\.getName\(/,
    /\.name\s*\|\|\s*["'][^"']+["']/,
];

function fileNeedsPatch(content) {
    return BAD_FALLBACKS.some(pattern => pattern.test(content));
}

function addImport(content) {
    if (content.includes("getUsername")) return content;

    // Insérer après le dernier bloc de requires consécutifs en haut
    const requireBlockRegex = /((?:(?:const|let|var)\s+\w+\s*=\s*require\([^)]+\);?\n)+)/g;
    let lastMatch = null;
    let match;
    while ((match = requireBlockRegex.exec(content)) !== null) {
        lastMatch = match;
    }

    if (lastMatch) {
        const insertAt = lastMatch.index + lastMatch[0].length;
        return content.slice(0, insertAt) + IMPORT_LINE + content.slice(insertAt);
    }

    // Fallback : insérer au tout début
    return IMPORT_LINE + content;
}

function patchContent(content) {
    // 1. Remplacer || "Utilisateur" / || "Facebook User" / || "Facebook"
    content = content.replace(
        /((?:const|let|var)\s+(\w+)\s*=\s*(?:[\w?.[\]]+\.name|await\s+[\w?.[\]]+\.getName\([^)]+\))\s*)\|\|\s*["'](?:Utilisateur|Facebook User|Facebook)["']/g,
        (match, before, varName) => {
            const uidGuess = before.match(/getName\(([^)]+)\)/)
                ? before.match(/getName\(([^)]+)\)/)[1]
                : before.match(/(?:getUserInfo\(|getName\()([^)]+)\)/)
                    ? before.match(/(?:getUserInfo\(|getName\()([^)]+)\)/)[1]
                    : "senderID";
            return `${varName} = await getUsername(${uidGuess}, api, usersData)`;
        }
    );

    // 2. Remplacer les patterns simples restants
    content = content.replace(
        /(\w+)\?\.name\s*\|\|\s*["'](?:Utilisateur|Facebook User|Facebook)["']/g,
        (match, obj) => `await getUsername(uid, api, usersData)`
    );

    // 3. usersData.getName(x) seul → getUsername
    content = content.replace(
        /await\s+usersData\.getName\(([^)]+)\)/g,
        (match, uidArg) => `await getUsername(${uidArg}, api, usersData)`
    );

    // 4. api.getUserInfo(uid)[uid]?.name → getUsername
    content = content.replace(
        /await\s+api\.getUserInfo\(([^)]+)\)\[[^\]]+\]\.name/g,
        (match, uidArg) => `await getUsername(${uidArg}, api, usersData)`
    );

    // 5. user.name || "Facebook User" dans les boucles
    content = content.replace(
        /user\.name\s*\|\|\s*["'](?:Utilisateur|Facebook User)["']/g,
        `await getUsername(user.userId || user.id, api, usersData)`
    );

    return content;
}

function patchFile(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, "utf8");
    } catch (e) {
        console.log(`❌ Lecture impossible : ${filePath}`);
        return;
    }

    if (!fileNeedsPatch(content)) {
        console.log(`⏭️  Ignoré   : ${path.basename(filePath)}`);
        return;
    }

    // Sauvegarde avant modification
    const backupPath = filePath + ".bak";
    fs.writeFileSync(backupPath, content, "utf8");

    let patched = patchContent(content);
    patched = addImport(patched);

    fs.writeFileSync(filePath, patched, "utf8");
    console.log(`✅ Patché   : ${path.basename(filePath)}`);
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`❌ Dossier introuvable : ${dir}`);
        process.exit(1);
    }

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (entry.endsWith(".js")) {
            patchFile(fullPath);
        }
    }
}

// ─── Point d'entrée ──────────────────────────────────────────────────────────
console.log("🔧 Démarrage du patch automatique...\n");
walkDir(CMDS_DIR);
console.log("\n✅ Patch terminé !");
console.log("💡 Les fichiers originaux ont été sauvegardés en .bak");
console.log("   Pour annuler : renomme les fichiers .bak en .js");