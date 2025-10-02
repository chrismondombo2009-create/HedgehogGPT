const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "save",
    version: "1.0",
    author: "JulioRaven",
    category: "admin",
    description: "Enregistre une commande locale dans le repo GitHub",
  },

  async handleCommand({ message, event, args }) {
    const permission = ["61578433048588", "61578281565957"]; // ton ID ici
    if (!permission.includes(event.senderID)) {
      return message.reply("❌| 𝙲𝚑𝚎𝚟𝚊𝚕 𝚍𝚎 𝚃𝚛𝚘𝚒𝚎 𝚍𝚎𝚝𝚎𝚌𝚝é𝚎 𝚍𝚊𝚗𝚜 𝚟𝚘𝚝𝚛𝚎 𝚌𝚘𝚍𝚎 ! 𝙴𝚌𝚑𝚎𝚌 𝚍𝚎 𝚕𝚊 𝚜𝚊𝚞𝚟𝚎𝚐𝚊𝚛𝚍𝚎 𝚍𝚎 𝚕𝚊 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚎.");
    }

    if (!args[0]) {
      return message.reply("Spécifie le nom de la commande à enregistrer (sans extension).");
    }

    const fileName = args[0].endsWith(".js") ? args[0] : `${args[0]}.js`;
    const filePath = path.join(__dirname, "..", "cmds", fileName);

    if (!fs.existsSync(filePath)) {
      return message.reply("Fichier introuvable dans le dossier cmds.");
    }

    const fileContent = fs.readFileSync(filePath, "utf8");

    // Config GitHub
    const GITHUB_TOKEN = "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";//le token de ton GitHub 
    const REPO_OWNER = "Sonic-Shisui";//ton Nom d'utilisateurs
    const REPO_NAME = "HedgehogGPT";//le nom de ton repositoire
    const BRANCH = "main";
    const GITHUB_PATH = `scripts/cmds/${fileName}`;
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${GITHUB_PATH}`;

    try {
      // Vérifie si le fichier existe déjà (pour récupérer le SHA)
      let sha;
      try {
        const { data } = await axios.get(apiUrl, {
          headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        sha = data.sha;
      } catch {
        sha = undefined;
      }

      const encodedContent = Buffer.from(fileContent).toString("base64");

      await axios.put(apiUrl, {
        message: `Ajout automatique de ${fileName}`,
        content: encodedContent,
        branch: BRANCH,
        sha
      }, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json"
        }
      });

      return message.reply(`Commande \`${fileName}\` enregistrée sur GitHub dans \`scripts/cmds/\`.`);

    } catch (error) {
      console.error("Erreur GitHub:", error.response?.data || error.message);
      return message.reply(`Erreur GitHub : ${error.response?.data?.message || error.message}`);
    }
  },

  onStart(params) {
    return this.handleCommand(params);
  }
};