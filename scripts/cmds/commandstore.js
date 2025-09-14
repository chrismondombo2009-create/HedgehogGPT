const axios = require("axios");

const serverURL = "https://cmdstore-api.onrender.com/";
const ADMIN_UID = ["61578433048588"];

function formatNumber(number) {
  const suffixes = [
    "", " thousand", " million", " billion", " billiard", " trillion", " trilliard",
    " quadrillion", " quadrilliard", " quintillion", " quintilliard", " sextillion", " sextilliard",
    " septillion", " septilliard", " octillion", " octilliard", " nonillion", " nonilliard",
    " decillion", " decilliard", " undecillion", " undecilliard", " duodecillion", " duodecilliard",
    " tredecillion", " tredecilliard", " quattuordecillion", " quattuordecilliard", " quindecillion",
    " quindecilliard", " sexdecillion", " sexdecilliard", " septendecillion", " septendecilliard",
    " octodecillion", " octodecilliard", " novemdecillion", " novemdecilliard", " vigintillion",
    " vigintilliard", " unvigintillion", " unvigintilliard", " duovigintillion", " duovigintilliard",
    " trevigintillion", " trevigintilliard", " quattuorvigintillion", " quattuorvigintilliard",
    " quinvigintillion", " quinvigintilliard", " sexvigintillion", " sexvigintilliard",
    " septenvigintillion", " septenvigintilliard", " octovigintillion", " octovigintilliard",
    " novemvigintillion", " novemvigintilliard", " trigintillion", " trigintilliard",
    " untrigintillion", " untrigintilliard", " duotrigintillion", " duotrigintilliard",
    " tretrigintillion", " tretrigintilliard", " quattuortrigintillion", " quattuortrigintilliard",
    " quintrigintillion", " quintrigintilliard"
  ];
  if (!Number.isFinite(number) || number === null || number === undefined) return "Price not defined";
  if (number < 1000) return number.toString();
  let exponent = Math.floor(Math.log10(number) / 3);
  let shortNumber = number / Math.pow(1000, exponent);
  return `${shortNumber.toFixed(2)}${suffixes[exponent]}`;
}

function getEmoji(category) {
  if (!category) return "❔";
  const cat = category.toLowerCase();
  if (cat.includes("fun")) return "🎉";
  if (cat.includes("economy")) return "💰";
  if (cat.includes("admin")) return "🛠️";
  return "📦";
}

module.exports = {
  config: {
    name: "store",
    aliases: ["commandstore"],
    version: "1.4",
    role: 0,
    shortDescription: { en: "Access the premium command store" },
    longDescription: {
      en: "Allows you to search and buy premium commands.\n- store page <number>\n- store search <name>\n- store search category <category>\n- store categories\n- store cart\n- store put <admin only>\n- store edit <admin only>\n- store delete <admin only>"
    },
    guide: { en: "{p}page <number>\n{p}search <command name>\n{p}search category <category>\n{p}categories\n{p}cart\n{p}put <name> <price> <category> <description>\n{p}edit <name>\n{p}delete <name>" },
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
    category: "economy"
  },

  onStart: async ({ api, event, args, message, usersData }) => {
    try {
      global.GoatBot.cart = global.GoatBot.cart || {};

      const sub = args[0]?.toLowerCase();

      // ➤ LIST CATEGORIES
      if (sub === "categories") {
        const response = await axios.get(`${serverURL}/api/commands`);
        const commands = response.data;
        const categories = [...new Set(commands.map(cmd => cmd.category).filter(Boolean))];
        if (!categories.length) return api.sendMessage("⚠️ No categories available.", event.threadID, event.messageID);

        const categoryList = categories.map((cat, index) => `${index + 1}- ${cat}`).join("\n");
        return api.sendMessage(
          `🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n📂 Available categories:\n${categoryList}\n\nReply with the number to see commands in that category.`,
          event.threadID,
          (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "store",
              type: "select_category",
              categories,
              messageID: info.messageID,
              userID: event.senderID,
              threadID: event.threadID,
              expiresAt: Date.now() + 300000
            });
          },
          event.messageID
        );
      }

      // ➤ VIEW CART
      if (sub === "cart") {
        const cartItems = global.GoatBot.cart[event.senderID] || [];
        if (!cartItems.length) return api.sendMessage("🛒 Your cart is empty.", event.threadID, event.messageID);

        const cartList = cartItems.map((item, i) => `${i + 1}- ${getEmoji(item.category)} ${item.itemName} (${formatNumber(item.price)} $)`).join("\n");
        const total = cartItems.reduce((sum, item) => sum + item.price, 0);

        return api.sendMessage(
          `🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n📜 Your Cart:\n${cartList}\n━━━━━━━━━━━━━━━\n💲 Total: ${formatNumber(total)} $\nReply "yes" to confirm all purchases or "no" to cancel.`,
          event.threadID,
          (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "store",
              type: "confirm_cart",
              messageID: info.messageID,
              userID: event.senderID,
              threadID: event.threadID,
              expiresAt: Date.now() + 300000
            });
          },
          event.messageID
        );
      }

      // ➤ PAGINATION
      if (sub === "page") {
        const page = parseInt(args[1]) || 1;
        const perPage = 15;
        const response = await axios.get(`${serverURL}/api/commands`);
        const commands = response.data;
        if (!commands.length) return api.sendMessage("⚠️ No commands available.", event.threadID, event.messageID);

        const totalPages = Math.ceil(commands.length / perPage);
        if (page < 1 || page > totalPages) return api.sendMessage(`⚠️ Invalid page. Available: 1-${totalPages}`, event.threadID, event.messageID);

        const start = (page - 1) * perPage;
        const end = start + perPage;
        const paginatedCommands = commands.slice(start, end);
        const commandList = paginatedCommands.map((cmd, index) => `${start + index + 1}- ${getEmoji(cmd.category)} ${cmd.itemName}`).join("\n");

        return api.sendMessage(
          `🛒 〖 CommandStore 〗 🛒\n━━━━━━━━━━━━━━━\n📜 List of commands (Page ${page}/${totalPages}):\n${commandList}\n━━━━━━━━━━━━━━━\nReply with the number of the command to add to cart.`,
          event.threadID,
          (err, info) => {
            if (err) return api.sendMessage("❌ Error sending message.", event.threadID, event.messageID);
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "store",
              type: "select",
              messageID: info.messageID,
              commands: paginatedCommands,
              userID: event.senderID,
              threadID: event.threadID,
              expiresAt: Date.now() + 300000
            });
          },
          event.messageID
        );
      }

      // ➤ SEARCH BY NAME
      if (sub === "search" && args[1]) {
        const query = args.slice(1).join(" ").toLowerCase();
        const response = await axios.get(`${serverURL}/api/commands`);
        const commands = response.data.filter(cmd => cmd.itemName.toLowerCase().includes(query));
        if (!commands.length) return api.sendMessage("⚠️ No commands found matching your search.", event.threadID, event.messageID);

        const list = commands.map((cmd, i) => `${i + 1}- ${getEmoji(cmd.category)} ${cmd.itemName}`).join("\n");
        return api.sendMessage(
          `🔎 Search Results for "${query}":\n${list}\n\nReply with the number to add to cart.`,
          event.threadID,
          (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "store",
              type: "select",
              messageID: info.messageID,
              commands,
              userID: event.senderID,
              threadID: event.threadID,
              expiresAt: Date.now() + 300000
            });
          },
          event.messageID
        );
      }

      // ➤ SEARCH BY CATEGORY
      if (sub === "search" && args[1]?.toLowerCase() === "category" && args[2]) {
        const category = args.slice(2).join(" ").toLowerCase();
        const response = await axios.get(`${serverURL}/api/commands`);
        const commands = response.data.filter(cmd => cmd.category?.toLowerCase() === category);
        if (!commands.length) return api.sendMessage(`⚠️ No commands found in category "${category}".`, event.threadID, event.messageID);

        const list = commands.map((cmd, i) => `${i + 1}- ${getEmoji(cmd.category)} ${cmd.itemName}`).join("\n");
        return api.sendMessage(
          `📂 Commands in category "${category}":\n${list}\n\nReply with the number to add to cart.`,
          event.threadID,
          (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "store",
              type: "select",
              messageID: info.messageID,
              commands,
              userID: event.senderID,
              threadID: event.threadID,
              expiresAt: Date.now() + 300000
            });
          },
          event.messageID
        );
      }

      // ➤ ADMIN PUT / EDIT / DELETE
      if (ADMIN_UID.includes(event.senderID)) {
        if (sub === "put") {
          const [itemName, price, category, ...descArr] = args.slice(1);
          if (!itemName || !price || !category || !descArr.length) return api.sendMessage("⚠️ Usage: store put <name> <price> <category> <description>", event.threadID, event.messageID);
          const description = descArr.join(" ");
          await axios.post(`${serverURL}/api/commands`, { itemName, price: Number(price), category, description });
          return api.sendMessage(`✅ Command "${itemName}" added successfully.`, event.threadID, event.messageID);
        }
        if (sub === "edit") {
          const itemName = args[1];
          if (!itemName) return api.sendMessage("⚠️ Usage: store edit <name>", event.threadID, event.messageID);
          return api.sendMessage(`ℹ️ Admin can now edit "${itemName}" in the backend dashboard.`, event.threadID, event.messageID);
        }
        if (sub === "delete") {
          const itemName = args[1];
          if (!itemName) return api.sendMessage("⚠️ Usage: store delete <name>", event.threadID, event.messageID);
          await axios.delete(`${serverURL}/api/commands/${encodeURIComponent(itemName)}`);
          return api.sendMessage(`🗑️ Command "${itemName}" deleted successfully.`, event.threadID, event.messageID);
        }
      }

    } catch (error) {
      return api.sendMessage("❌ Error: " + error.message, event.threadID, event.messageID);
    }
  },

  onReply: async ({ api, event, message, Reply, usersData }) => {
    const { commandName, type, messageID, userID, threadID, expiresAt, commands } = Reply;
    if (event.senderID !== userID || event.threadID !== threadID) return;
    if (Date.now() > expiresAt) {
      global.GoatBot.onReply.delete(messageID);
      return api.sendMessage("⏳ Request expired (5 minutes).", threadID, event.messageID);
    }

    // ➤ CATEGORY SELECTION
    if (commandName === "store" && type === "select_category") {
      const choice = parseInt(event.body.trim());
      if (isNaN(choice) || choice < 1 || choice > Reply.categories.length) return api.sendMessage("⚠️ Invalid choice!", threadID, event.messageID);

      const selectedCategory = Reply.categories[choice - 1];
      const response = await axios.get(`${serverURL}/api/commands`);
      const commands = response.data.filter(cmd => cmd.category?.toLowerCase() === selectedCategory.toLowerCase());
      if (!commands.length) return api.sendMessage("⚠️ No commands in this category.", threadID, event.messageID);

      const commandList = commands.map((cmd, i) => `${i + 1}- ${getEmoji(cmd.category)} ${cmd.itemName}`).join("\n");
      return api.sendMessage(
        `🛒 〖 CommandStore 〗 🛒\n📂 ${selectedCategory} Commands:\n${commandList}\n\nReply with the number to add to cart.`,
        threadID,
        (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "store",
            type: "select",
            messageID: info.messageID,
            commands,
            userID,
            threadID,
            expiresAt: Date.now() + 300000
          });
        },
        event.messageID
      );
    }

    // ➤ SELECT COMMAND -> ADD TO CART
    if (commandName === "store" && type === "select") {
      const choice = parseInt(event.body.trim());
      if (isNaN(choice) || choice < 1 || choice > commands.length) return api.sendMessage("⚠️ Invalid choice!", threadID, event.messageID);

      const selectedItem = commands[choice - 1];
      global.GoatBot.cart[event.senderID] = global.GoatBot.cart[event.senderID] || [];
      global.GoatBot.cart[event.senderID].push(selectedItem);

      return api.sendMessage(
        `✅ Added "${selectedItem.itemName}" to your cart.\nType "store cart" to view and confirm purchases.`,
        threadID,
        event.messageID
      );
    }

    // ➤ CONFIRM CART PURCHASE
    if (commandName === "store" && type === "confirm_cart") {
      const response = event.body.trim().toLowerCase();
      if (response === "no") {
        global.GoatBot.cart[event.senderID] = [];
        global.GoatBot.onReply.delete(messageID);
        return api.sendMessage("❌ Purchase canceled.", threadID, event.messageID);
      }
      if (response === "yes") {
        const cartItems = global.GoatBot.cart[event.senderID] || [];
        if (!cartItems.length) return api.sendMessage("🛒 Your cart is empty.", threadID, event.messageID);

        let userMoney = await usersData.get(event.senderID, "money") || 0;
        const total = cartItems.reduce((sum, item) => sum + item.price, 0);

        if (userMoney < total) {
          return api.sendMessage(`⚠️ Insufficient funds! Required: ${formatNumber(total)} $ | You: ${formatNumber(userMoney)} $`, threadID, event.messageID);
        }

        userMoney -= total;
        await usersData.set(event.senderID, { money: userMoney });
        global.GoatBot.cart[event.senderID] = [];
        global.GoatBot.onReply.delete(messageID);

        const purchasedList = cartItems.map(item => `${getEmoji(item.category)} ${item.itemName}`).join("\n");
        return api.sendMessage(`✅ Purchase successful!\n📌 You bought:\n${purchasedList}`, threadID, event.messageID);
      }
    }
  }
};