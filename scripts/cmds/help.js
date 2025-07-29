const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

// Fonction pour transformer un texte en police Bold Serif Unicode (𝐚, 𝐛, 𝐜, 𝐀, 𝐁, 𝐂, ...)
function toBoldSerifFont(text) {
  return text.split('').map(char => {
    // minuscules
    if (char >= 'a' && char <= 'z') {
      return String.fromCodePoint(char.charCodeAt(0) - 0x61 + 0x1D41A);
    }
    // majuscules
    if (char >= 'A' && char <= 'Z') {
      return String.fromCodePoint(char.charCodeAt(0) - 0x41 + 0x1D400);
    }
    return char;
  }).join('');
}

module.exports = {
  config: {
    name: "help",
    version: "1.18",
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
    countDown: 5,
    shortDescription: {
      en: "View command usage and list all commands directly",
    },
    longDescription: {
      en: "View command usage and list all commands directly",
    },
    category: "info",
    guide: {
      en: "{p}help cmdName ",
    },
    priority: 1,
  },

  onStart: async function ({ message, args, event, threadsData }) {
 

    const { threadID } = event;
    const prefix = getPrefix(threadID);
    const language = "en";

    if (args.length === 0) {
      const categories = {};
      let msg = "";

      // Rassemble les commandes par catégorie
      for (const [name, value] of commands) {
        const category = value.config.category || "Uncategorized";
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(name);
      }

      // Formate les catégories et commandes en police bold serif
      const formattedCategoriesList = Object.keys(categories).map(category => {
        const boldSerifCategory = toBoldSerifFont(category.toUpperCase());
        return { category, boldSerifCategory };
      });

      const formattedCommandsList = Object.entries(categories).map(([category, cmds]) => {
        const boldSerifCommands = cmds.map(command => toBoldSerifFont(command));
        return { category, boldSerifCommands };
      });

      // Génère le message final
      for (const { category, boldSerifCategory } of formattedCategoriesList) {
        if (category !== "info") {
          let section = `\n╭─⊙『  ${boldSerifCategory}  』`;

          const commandsForCategory = formattedCommandsList.find(cmd => cmd.category === category).boldSerifCommands;
          for (let i = 0; i < commandsForCategory.length; i += 2) {
            const cmds = commandsForCategory.slice(i, i + 2).map(item => `✧ ${item}`).join(" ");
            section += `\n│${cmds}`;
          }
          section += `\n╰────────────⊙`;
          msg += section;
        }
      }

      await message.reply({ body: msg });
    } else {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));

      if (!command) {
        await message.reply(`Command "${toBoldSerifFont(commandName)}" not found.`);
      } else {
        const configCommand = command.config;
        const author = configCommand.author || "Unknown";

        const longDescription = configCommand.longDescription
          ? configCommand.longDescription[language] ||
            configCommand.longDescription.en ||
            "No description"
          : "No description";

        const guideBody = configCommand.guide?.[language] || configCommand.guide?.en || "No guide available.";
        const usage = guideBody.replace(/{p}/g, prefix).replace(/{n}/g, configCommand.name);

        // Tout en police bold serif
        const boldSerifDescription = toBoldSerifFont(longDescription);
        const boldSerifUsage = toBoldSerifFont(usage);
        const boldSerifCommandName = toBoldSerifFont(configCommand.name);

        const response = `
╭───⊙
  │ 🔶 ${boldSerifCommandName}
  ├── INFO
  │ 📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${boldSerifDescription}
  │ 👑 𝗔𝘂𝘁𝗵𝗼𝗿: ${toBoldSerifFont(author)}
  │ ⚙️ 𝗚𝘂𝗶𝗱𝗲: ${boldSerifUsage}
  ╰────────────⊙`;

        await message.reply(response);
      }
    }
  },
};