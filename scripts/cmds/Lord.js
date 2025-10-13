module.exports = {
  config: {
    name: "lord",
    aliases: ["lrd"],
    version: "1.0",
    author: "ʬɸʬ 𝐒𝐡𝐢𝐬𝐮𝐢 𝐗 𝐀𝐫𝐜𝐚𝐧𝐨 ʬɸʬ",
    countDown: 10,
    role: 0,
    shortDescription: "Amuses toi bien au jeu du hasard",
    longDescription: "Seul le hasard tu rendras riche ou pauvre...Bonne chance",
    category: "game",
    guide: "{pn} <Suzaku/Zero> <amount of money>"
  },

  onStart: async function ({ args, message, usersData, event }) {
    const betType = args[0];
    const betAmount = parseInt(args[1]);
    const user = event.senderID;
    const userData = await usersData.get(event.senderID);

    if (!["suzaku", "zero"].includes(betType)) {
      return message.reply("❤‍🔥 | 𝗖𝗵𝗼𝗶𝘀𝗶 : '𝘀𝘂𝘇𝗮𝗸𝘂' 𝗼𝘂 '𝘇𝗲𝗿𝗼'.");
    }

    if (!Number.isInteger(betAmount) || betAmount < 50) {
      return message.reply("🌿 | 𝘁𝗮 𝗺𝗲̂𝗺𝗲 𝗽𝗮𝘀 50$ ?  .");
    }

    if (betAmount > userData.money) {
      return message.reply("🌝| 𝐕𝐚, 𝐭𝐮 𝐧'𝐚𝐬 𝐩𝐚𝐬 𝐜𝐞𝐭𝐭𝐞 𝐬𝐨𝐦𝐦𝐞 ");
    }

    const dice = [1, 2, 3, 4, 5, 6];
    const results = [];

    for (let i = 0; i < 3; i++) {
      const result = dice[Math.floor(Math.random() * dice.length)];
      results.push(result);
    }

    const winConditions = {
      small: results.filter((num, index, arr) => num >= 1 && num <= 3 && arr.indexOf(num) !== index).length > 0,
      big: results.filter((num, index, arr) => num >= 4 && num <= 6 && arr.indexOf(num) !== index).length > 0,
    };

    const resultString = results.join(" | ");

    if ((winConditions[betType] && Math.random() <= 0.4) || (!winConditions[betType] && Math.random() > 0.4)) {
      const winAmount = 2 * betAmount;
      userData.money += winAmount;
      await usersData.set(event.senderID, userData);
      return message.reply(`🎀✨𝗛𝗘𝗗𝗘𝗚𝗘𝗛𝗢𝗚✨🎀
 ───────────
💘[ ${resultString} ]💘\ 💚|𝐁𝐫𝐚𝐯𝐨 𝐭'𝐚𝐬 𝐠𝐚𝐠𝐧𝐞 🎀${winAmount}€🎀
!`);
    } else {
      userData.money -= betAmount;
      await usersData.set(event.senderID, userData);
      return message.reply(`𝗛𝗘𝗗𝗚𝗘𝗛𝗢𝗚 
  ─────────── 
ʕ˖͜͡˖ʔ[ ${resultString} ]ʕ˖͜͡˖ʔ
😝| 𝗕𝗜𝗘𝗡 𝗙𝗔𝗜𝗦 𝗣𝗢𝗨𝗥 𝗧𝗢𝗜 𝗧𝗔 𝗣𝗘𝗥𝗗𝗨 🎀${betAmount}€🎀
𝗧𝗨 𝗩𝗘𝗨𝗫 𝗘𝗡𝗖𝗢𝗥𝗘...!? 🩸🦦.`);
    }
  }
}
