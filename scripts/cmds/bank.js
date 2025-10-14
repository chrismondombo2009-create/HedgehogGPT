const fs = require("fs");
const path = require("path");

const BANK_FILE = path.join(__dirname, "bank.json");

module.exports = {
  config: {
    name: "bank",
    description: "Deposit or withdraw money from the bank and earn interest",
    guide: {
      vi: "",
      en:
        "Bank:\nInterest - Balance - Withdraw - Deposit - Transfer - Richest - Loan - Payloan - Lottery - Gamble - HighRiskInvest[hrinvest] - Heist"
    },
    category: "game",
    countDown: 1,
    role: 0,
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡"
  },
  onStart: async function({ args, message, event, api, usersData }) {
    const { getPrefix } = global.utils;
    const p = getPrefix(event.threadID);

    // --- ensure bank.json exists + load ---
    if (!fs.existsSync(BANK_FILE)) {
      fs.writeFileSync(BANK_FILE, JSON.stringify({}, null, 2));
    }
    let bankData = {};
    try {
      bankData = JSON.parse(fs.readFileSync(BANK_FILE, "utf8"));
    } catch (e) {
      bankData = {};
      fs.writeFileSync(BANK_FILE, JSON.stringify(bankData, null, 2));
    }

    // helpers
    function saveBank() {
      try {
        fs.writeFileSync(BANK_FILE, JSON.stringify(bankData, null, 2));
      } catch (e) {
        console.error("Failed saving bank.json:", e);
      }
    }

    function ensureAccount(id) {
      if (!bankData[id]) {
        bankData[id] = {
          bank: 0,
          wallet: 0, // optional local wallet cache (main balance is in usersData)
          lastInterestClaimed: Date.now(),
          password: null,
          passwordAttempts: 0,
          lockedUntil: 0,
          loan: 0,
          loanPayed: true,
          role: null, // VIP
          achievements: [],
          history: [],
          karma: 0,
          insured: false,
          vault: 0, // coffre-fort
          prisonUntil: 0,
          failedHeists: 0,
          lotteryTickets: [],
          bonds: [], // {amount, end, rate}
          dailyClaim: 0
        };
        saveBank();
      }
    }

    function addHistory(id, text) {
      ensureAccount(id);
      const entry = { text, date: new Date().toISOString() };
      bankData[id].history.unshift(entry);
      if (bankData[id].history.length > 50) bankData[id].history.pop();
      saveBank();
    }

    function giveAchievement(id, name) {
      ensureAccount(id);
      if (!bankData[id].achievements.includes(name)) {
        bankData[id].achievements.push(name);
        addHistory(id, `🏅 Achievement unlocked: ${name}`);
        // notify user
        try {
          api.sendMessage(`🏆 Achievement unlocked: ${name}`, id);
        } catch (e) {}
      }
    }

    // get current user data
    const rawUserMoney = await usersData.get(event.senderID, "money");
    const userMoney = typeof rawUserMoney === "number" ? rawUserMoney : 0;
    const user = parseInt(event.senderID);
    let username = "Unknown";
    try {
      const info = await api.getUserInfo(user);
      username = info[user].name;
    } catch (e) {}

    // ensure current user account exists
    ensureAccount(user);

    const command = args[0]?.toLowerCase();
    const amount = parseInt(args[1]);
    const recipientUID = parseInt(args[2]);

    // command protections: check if locked/prison
    const now = Date.now();
    if (bankData[user].prisonUntil && bankData[user].prisonUntil > now) {
      // only allow some safe commands
      const allowedWhilePrison = ["show", "balance", "help", "history"];
      if (command && !allowedWhilePrison.includes(command)) {
        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You are in prison until ${new Date(bankData[user].prisonUntil).toLocaleString()}. You cannot use this command.🔒`
        );
      }
    }

    // MAIN SWITCH
    switch (command) {
      // -------------------------
      // DEPOSIT with password (preserve original style)
      // -------------------------
      case "deposit": {
        const depositPassword = args[1];
        const depositAmount = parseInt(args[2]);

        if (!depositPassword || !depositAmount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide both a password and a valid amount for deposit.🔑\n\nIf you don't set your password then set by -bank setpassword (password)\n\nExample: -bank deposit (your_password) (your_amount)"
          );
        }

        if (bankData[user].password !== depositPassword) {
          bankData[user].passwordAttempts = (bankData[user].passwordAttempts || 0) + 1;
          if (bankData[user].passwordAttempts >= 3) {
            bankData[user].lockedUntil = Date.now() + 1000 * 60 * 5; // blocked for 5 minutes
            saveBank();
            return message.reply(
              "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Your account is temporarily locked for 5 minutes due to multiple failed attempts.🔐"
            );
          }
          saveBank();
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Please try again.🔑"
          );
        }
        // reset attempts
        bankData[user].passwordAttempts = 0;

        if (isNaN(depositAmount) || depositAmount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid deposit amount.💸"
          );
        }

        if (userMoney < depositAmount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have the required amount✖"
          );
        }

        bankData[user].bank += depositAmount;
        await usersData.set(event.senderID, {
          money: userMoney - depositAmount
        });
        addHistory(user, `🏦 Deposit ${depositAmount}$`);
        saveBank();

        // achievements & notify
        if (bankData[user].bank >= 1000000) giveAchievement(user, "Millionaire");
        try {
          api.sendMessage(
            `✅ Deposit successful: +${depositAmount}$ added to your bank.`,
            user
          );
        } catch (e) {}

        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Successfully deposited ${depositAmount}$ into your bank account.`
        );
      }

      // -------------------------
      // WITHDRAW
      // -------------------------
      case "withdraw": {
        const withdrawPassword = args[1];
        const withdrawAmount = parseInt(args[2]);

        if (!withdrawPassword || !withdrawAmount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide both a password and a valid amount for withdrawal.🔑\n\nIf you don't set your password then set by -bank setpassword (password)\n\nExample: -bank withdraw (your_password) (your_amount)"
          );
        }

        if (bankData[user].password !== withdrawPassword) {
          bankData[user].passwordAttempts = (bankData[user].passwordAttempts || 0) + 1;
          if (bankData[user].passwordAttempts >= 3) {
            bankData[user].lockedUntil = Date.now() + 1000 * 60 * 5;
            saveBank();
            return message.reply(
              "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Your account is temporarily locked for 5 minutes due to multiple failed attempts.🔐"
            );
          }
          saveBank();
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Please try again.🔑"
          );
        }
        bankData[user].passwordAttempts = 0;

        const balance = bankData[user].bank || 0;

        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid withdrawal amount.💸"
          );
        }

        if (withdrawAmount > balance) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧The requested amount is greater than the available balance in your bank account.👽"
          );
        }

        bankData[user].bank = balance - withdrawAmount;
        await usersData.set(event.senderID, {
          money: userMoney + withdrawAmount
        });
        addHistory(user, `🏧 Withdraw ${withdrawAmount}$`);
        saveBank();

        try {
          api.sendMessage(
            `✅ Withdrawal successful: ${withdrawAmount}$ has been sent to your wallet.`,
            user
          );
        } catch (e) {}
        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Successfully withdrew ${withdrawAmount}$ from your bank account.`
        );
      }

      // -------------------------
      // HIGH RISK INVEST
      // -------------------------
      case "hrinvest": {
        const investmentAmount = parseInt(args[1]);

        if (isNaN(investmentAmount) || investmentAmount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid investment amount.💸"
          );
        }

        if (bankData[user].bank < investmentAmount) {
          return message.reply("✧You don't have enough in bank to invest.");
        }

        const riskOutcome = Math.random() < 0.7;
        const potentialReturns = investmentAmount * (riskOutcome ? 2 : 0.2);

        if (riskOutcome) {
          bankData[user].bank -= investmentAmount;
          addHistory(user, `📉 HighRiskInvest LOST ${investmentAmount}$`);
          // reputation down
          bankData[user].karma = Math.max(0, (bankData[user].karma || 0) - 1);
          bankData[user].failedHeists = (bankData[user].failedHeists || 0) + 1;
          saveBank();
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your high-risk investment of ${investmentAmount}$ was risky, and you lost your money. 😔`
          );
        } else {
          bankData[user].bank += potentialReturns;
          addHistory(user, `📈 HighRiskInvest WIN ${potentialReturns}$`);
          bankData[user].karma = (bankData[user].karma || 0) + 2;
          saveBank();
          giveAchievement(user, "Lucky Investor");
          try {
            api.sendMessage(
              `🎉 Your high-risk investment paid off: +${potentialReturns}$!`,
              user
            );
          } catch (e) {}
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Congratulations! Your high-risk investment of ${investmentAmount}$ paid off, and you earned ${potentialReturns}$ in returns! 🎉`
          );
        }
      }

      // -------------------------
      // GAMBLE (VIP only)
      // -------------------------
      case "gamble": {
        // Vérifie VIP
        if (bankData[user].bank >= 100000000000 && bankData[user].role !== "VIP") {
          bankData[user].role = "VIP";
          saveBank();
          try {
            api.sendMessage(
              "🎉 Congratulations! You've been added to the VIP list because your bank balance reached 100,000,000,000$! You can now access the 'gamble' feature. 👑",
              user
            );
          } catch (e) {}
        }

        if (bankData[user].role !== "VIP") {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Only VIP users can access the 'gamble' feature.\n✧ Reach a bank balance of 100,000,000,000$ to unlock VIP status. 👑"
          );
        }

        const betAmount = parseInt(args[1]);

        if (isNaN(betAmount) || betAmount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please enter a valid amount to bet.💸"
          );
        }

        if (userMoney < betAmount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You don't have enough money to place that bet. 🙅‍♂"
          );
        }

        const winChance = Math.random() < 0.5;
        if (winChance) {
          const winnings = betAmount * 2;
          bankData[user].bank += winnings;
          await usersData.set(event.senderID, {
            money: userMoney - betAmount + winnings
          });
          addHistory(user, `🎲 Gamble WIN ${winnings}$`);
          saveBank();
          giveAchievement(user, "Gambler");
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Congratulations! You've won ${winnings}$! 🎉`
          );
        } else {
          bankData[user].bank -= betAmount;
          await usersData.set(event.senderID, {
            money: userMoney - betAmount
          });
          addHistory(user, `🎲 Gamble LOSE ${betAmount}$`);
          bankData[user].karma = Math.max(0, (bankData[user].karma || 0) - 1);
          saveBank();
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Oh no! You've lost ${betAmount}$ in the gamble. 😢`
          );
        }
      }

      // -------------------------
      // HEIST (simple)
      // -------------------------
      case "heist": {
        const heistSuccessChance = 0.2;
        const heistWinAmount = 1000;
        const heistLossAmount = 500;

        // anti-heist: if too many failures, block for a while
        if (bankData[user].failedHeists >= 5) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your account is flagged for too many failed heists. Heist is temporarily disabled for you.🚫"
          );
        }

        const isSuccess = Math.random() < heistSuccessChance;

        if (isSuccess) {
          const winnings = heistWinAmount;
          bankData[user].bank += winnings;
          bankData[user].failedHeists = 0;
          addHistory(user, `💥 Heist SUCCESS +${winnings}$`);
          saveBank();
          giveAchievement(user, "Heist Master");
          try {
            api.sendMessage(`💰 Bank heist successful! You've won ${winnings}$!`, user);
          } catch (e) {}
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Bank heist successful! You've won ${winnings}$! 💰`
          );
        } else {
          const lossAmount = heistLossAmount;
          bankData[user].bank -= lossAmount;
          bankData[user].failedHeists = (bankData[user].failedHeists || 0) + 1;
          // if too many fails, set prison or block
          if (bankData[user].failedHeists >= 3) {
            bankData[user].prisonUntil = Date.now() + 1000 * 60 * 60; // 1 hour
            addHistory(user, `🚨 Heist failed multiple times — Prison 1 hour`);
            try {
              api.sendMessage(
                `🚔 You were caught after multiple failed heists. Prison for 1 hour.`,
                user
              );
            } catch (e) {}
          } else {
            addHistory(user, `❌ Heist fail -${lossAmount}$`);
          }
          saveBank();
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Bank heist failed! You've lost ${lossAmount}$! 😔`
          );
        }
      }

      // -------------------------
      // SHOW (balance info)
      // -------------------------
      case "show": {
        const bankBalance =
          bankData[user].bank !== undefined && !isNaN(bankData[user].bank) ? bankData[user].bank : 0;
        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your bank balance is: ${bankBalance}$ •\n✧To withdraw money.\n type:\n${p}Bank Withdraw 'your withdrawal amount'•\n✧To earn interest\ntype:\n${p}Bank Interest•`
        );
      }

      // -------------------------
      // INTEREST (with VIP boost)
      // -------------------------
      case "interest": {
        const interestRate = 0.001; // base
        const lastInterestClaimed = bankData[user].lastInterestClaimed || Date.now();
        const currentTime = Date.now();
        const timeDiffInSeconds = (currentTime - lastInterestClaimed) / 1000;
        let rate = interestRate;
        if (bankData[user].role === "VIP") rate = interestRate * 3; // VIP triple
        const interestEarned = bankData[user].bank * (rate / 970) * timeDiffInSeconds;

        if (bankData[user].bank <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have any money in your bank account to earn interest.💸🤠"
          );
        }

        bankData[user].lastInterestClaimed = currentTime;
        bankData[user].bank += interestEarned;
        addHistory(user, `💹 Interest +${interestEarned.toFixed(2)}$`);
        saveBank();

        if (bankData[user].role === "VIP") giveAchievement(user, "VIP Investor");

        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You have earned interest of ${interestEarned.toFixed(
            2
          )} $ . It has been successfully added to your account balance..✅`
        );
      }

      // -------------------------
      // TRANSFER
      // -------------------------
      case "transfer": {
        const senderBalance = bankData[user]?.bank || 0;
        if (isNaN(amount) || amount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please enter a valid amount greater than 0 for the transfer. ♻"
          );
        }
        if (senderBalance < amount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Insufficient funds in your bank account to complete this transfer. ✖"
          );
        }
        if (isNaN(recipientUID) || recipientUID <= 0) {
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please provide a valid recipient ID (UID).\nExample:\n${p}bank transfer 5000 123456789`
          );
        }
        if (recipientUID === user) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You cannot transfer money to yourself. 🔄"
          );
        }
        ensureAccount(recipientUID);
        bankData[user].bank -= amount;
        bankData[recipientUID].bank += amount;
        addHistory(user, `➡️ Transfer ${amount}$ to ${recipientUID}`);
        addHistory(recipientUID, `⬅️ Received ${amount}$ from ${user}`);
        saveBank();

        let recipientName = "Unknown User";
        try {
          const recipientInfo = await api.getUserInfo(recipientUID);
          recipientName = recipientInfo[recipientUID]?.name || "Unknown User";
        } catch (error) {}

        const transferMsg = `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You have transferred ${amount}$ to:\n✧ Name: ${recipientName}\n✧ BankID: ${recipientUID}\nYour current bank balance: ${bankData[user].bank}$\n\n~ HEDGEHOG Database ✅`;

        const recipientMsg = `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You have received ${amount}$ from:\n✧ Name: ${username}\n✧ BankID: ${user}\nYour current bank balance: ${bankData[recipientUID].bank}$\n\n~ HEDGEHOG Database ✅`;

        try {
          await api.sendMessage(transferMsg, user);
        } catch (e) {}
        try {
          await api.sendMessage(recipientMsg, recipientUID);
        } catch (e) {}

        return message.reply(transferMsg);
      }

      // -------------------------
      // BALANCE (alias)
      // -------------------------
      case "balance": {
        if (!bankData[user]) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You do not have a bank account. Please create one by performing a transaction like 'deposit'."
          );
        }

        const userBankBalance = bankData[user].bank || 0;
        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Your current bank balance is: ${userBankBalance}$.\n✧ To deposit money, use:\n${p}bank deposit [amount]\n✧ To withdraw money, use:\n${p}bank withdraw [amount]\n━━━━━━━━━━━━━━━━`
        );
      }

      // -------------------------
      // TOP (richest)
      // -------------------------
      case "top": {
        const bankDataCp = JSON.parse(fs.readFileSync(BANK_FILE, "utf8"));

        const topUsers = Object.entries(bankDataCp)
          .sort(([, a], [, b]) => (b.bank || 0) - (a.bank || 0))
          .slice(0, 25);

        const output = (
          await Promise.all(
            topUsers.map(async ([userID, userData], index) => {
              const userName = await usersData.getName(userID);
              return `[${index + 1}. ${userName}] • ${userData.bank || 0}$`;
            })
          )
        ).join("\n");

        return message.reply("𝐑𝐢𝐜𝐡𝐞𝐬𝐭 𝐩𝐞𝐨𝐩𝐥𝐞 𝐢𝐧 𝐭𝐡𝐞 𝐔𝐂𝐇𝐈𝐖𝐀 𝐬𝐲𝐬𝐭𝐞𝐦👑🤴:\n" + output);
      }

      // -------------------------
      // SET PASSWORD
      // -------------------------
      case "setpassword": {
        const newPassword = args[1];
        if (!newPassword) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide a new password to set.🔑"
          );
        }
        bankData[user].password = newPassword;
        bankData[user].passwordAttempts = 0;
        saveBank();
        return message.reply(
          "[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]\n━━━━━━━━━━━━━━━━\n✧Your password has been set successfully.🔑"
        );
      }

      // -------------------------
      // CHANGE PASSWORD
      // -------------------------
      case "changepassword": {
        const currentPassword = args[1];
        const newPwd = args[2];

        if (!currentPassword || !newPwd) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide your current password and a new password to change.🔑"
          );
        }

        if (bankData[user].password !== currentPassword) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect current password. Please try again.🔑"
          );
        }
        bankData[user].password = newPwd;
        saveBank();
        return message.reply(
          "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your password has been changed successfully.🔑"
        );
      }

      // -------------------------
      // REMOVE PASSWORD
      // -------------------------
      case "removepassword": {
        if (!bankData[user].password) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You do not have a password set for your account.🔒"
          );
        }
        bankData[user].password = null;
        saveBank();
        return message.reply(
          "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your password has been removed successfully.🔒"
        );
      }

      // -------------------------
      // LOAN
      // -------------------------
      case "loan": {
        const maxLoanAmount = 10000;
        const userLoan = bankData[user].loan || 0;
        const loanPayed = bankData[user].loanPayed !== undefined ? bankData[user].loanPayed : true;

        if (!amount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid loan amount..❗"
          );
        }

        if (amount > maxLoanAmount) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧The maximum loan amount is 10000 ‼"
          );
        }

        if (!loanPayed && userLoan > 0) {
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You cannot take a new loan until you pay off your current loan..🌚\nYour current loan to pay: ${userLoan}$`
          );
        }

        bankData[user].loan = userLoan + amount;
        bankData[user].loanPayed = false;
        bankData[user].bank += amount;

        addHistory(user, `🏦 Loan received ${amount}$`);
        saveBank();

        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You have successfully taken a loan of ${amount}$. Please note that loans must be repaid within a certain period.😉`
        );
      }

      // -------------------------
      // VIP / VIP LIST
      // -------------------------
      case "vip": {
        if (args[1] && args[1].toLowerCase() === "list") {
          const bankDataCp = JSON.parse(fs.readFileSync(BANK_FILE, "utf8"));
          const vipUsers = Object.entries(bankDataCp)
            .filter(([, data]) => data.role === "VIP")
            .sort(([, a], [, b]) => (b.bank || 0) - (a.bank || 0));
          if (vipUsers.length === 0) {
            return message.reply("👑 Il n'y a actuellement aucun membre VIP.");
          }
          const vipList = (
            await Promise.all(
              vipUsers.map(async ([id, data], i) => {
                let name = "Inconnu";
                try {
                  name = await usersData.getName(id);
                } catch {}
                return `[${i + 1}] ${name} (ID: ${id}) • Solde: ${data.bank || 0}$`;
              })
            )
          ).join("\n");
          return message.reply("👑 Liste des membres VIP :\n" + vipList);
        }

        if (bankData[user].role === "VIP") {
          return message.reply("🎉 You are already a VIP member! Enjoy your exclusive privileges. 👑");
        }
        if (bankData[user].bank >= 100000000000) {
          bankData[user].role = "VIP";
          saveBank();
          return message.reply(
            "🎉 Congratulations! You've been added to the VIP list because your bank balance reached 100,000,000,000$! You can now access VIP-exclusive features. 👑"
          );
        } else {
          return message.reply(
            "⛔ You need at least 100,000,000,000$ in your bank balance to become a VIP member. Keep saving! 💸"
          );
        }
      }

      // -------------------------
      // PAYLOAN
      // -------------------------
      case "payloan": {
        const loanBalance = bankData[user].loan || 0;

        if (isNaN(amount) || amount <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid amount to repay your loan..❗"
          );
        }

        if (loanBalance <= 0) {
          return message.reply(
            "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have any pending loan payments.😄"
          );
        }

        if (amount > loanBalance) {
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧The amount required to pay off the loan is greater than your due amount. Please pay the exact amount.😊\nYour total loan: ${loanBalance}$`
          );
        }

        if (amount > userMoney) {
          return message.reply(
            `[🏦 ==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You do not have ${amount}$ in your balance to repay the loan.❌\nType ${p}bal\nto view your current main balance..😞`
          );
        }

        bankData[user].loan = loanBalance - amount;

        if (loanBalance - amount === 0) {
          bankData[user].loanPayed = true;
        }

        await usersData.set(event.senderID, {
          money: userMoney - amount
        });

        addHistory(user, `💳 Loan payment ${amount}$`);
        saveBank();

        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Successfully repaid ${amount}$ towards your loan.✅\n\nto check type:\n${p}bank balance\n\nAnd your current loan to pay: ${bankData[user].loan}$`
        );
      }

      // -------------------------
      // LOTTERY (buy / draw)
      // -------------------------
      case "lottery": {
        const sub = args[1]?.toLowerCase();
        if (sub === "buy") {
          const ticketCost = parseInt(args[2]) || 1000;
          if (userMoney < ticketCost) return message.reply("✧You don't have enough money to buy a ticket.");
          await usersData.set(event.senderID, { money: userMoney - ticketCost });
          ensureAccount(user);
          bankData[user].lotteryTickets = bankData[user].lotteryTickets || [];
          const ticketId = `${user}-${Date.now()}`;
          bankData[user].lotteryTickets.push(ticketId);
          addHistory(user, `🎟️ Lottery buy ticket ${ticketId} (${ticketCost}$)`);
          saveBank();
          return message.reply(`🎟️ You bought a lottery ticket (#${ticketId}). Good luck!`);
        } else if (sub === "draw") {
          // draw: allow only thread admin or the bot owner - here we'll allow the user with role 'VIP' or admin of thread
          // For safety we do a simple check: only user with bankData[user].role === 'VIP' can draw
          if (bankData[user].role !== "VIP") {
            return message.reply("✧Only VIP users can draw the lottery.");
          }
          // collect all tickets
          const allTickets = [];
          for (const id in bankData) {
            if (bankData[id].lotteryTickets && bankData[id].lotteryTickets.length) {
              bankData[id].lotteryTickets.forEach(t => allTickets.push({ owner: id, ticket: t }));
            }
          }
          if (allTickets.length === 0) return message.reply("No lottery tickets found.");
          const winner = allTickets[Math.floor(Math.random() * allTickets.length)];
          const prize = allTickets.length * 1000; // e.g., ticket cost assumed 1000
          bankData[winner.owner].bank = (bankData[winner.owner].bank || 0) + prize;
          addHistory(winner.owner, `🏆 Lottery WIN ${prize}$ (ticket ${winner.ticket})`);
          // clear all tickets
          for (const id in bankData) bankData[id].lotteryTickets = [];
          saveBank();
          try {
            await api.sendMessage(`🎉 Lottery Winner: ${winner.owner} won ${prize}$!`, winner.owner);
          } catch (e) {}
          return message.reply(`🎉 Lottery drawn! Winner is ${winner.owner} and won ${prize}$!`);
        } else {
          return message.reply(
            `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Lottery commands:\n${p}bank lottery buy [cost]\n${p}bank lottery draw (VIP only)\n`
          );
        }
      }

      // -------------------------
      // INSURE (buy insurance)
      // -------------------------
      case "insure":
      case "insurance": {
        // buy insurance
        if (args[1] && args[1].toLowerCase() === "buy") {
          const cost = 500; // flat insurance fee
          if (userMoney < cost) return message.reply("✧You don't have enough money to buy insurance.");
          await usersData.set(event.senderID, { money: userMoney - cost });
          bankData[user].insured = true;
          addHistory(user, `🛡️ Insurance bought ${cost}$`);
          saveBank();
          return message.reply(`🛡️ Insurance purchased. You are protected for the next risky loss.`);
        } else if (args[1] && args[1].toLowerCase() === "status") {
          return message.reply(`🛡️ Insurance status: ${bankData[user].insured ? "Active" : "Not active"}`);
        } else {
          return message.reply(
            `🛡️ Insurance commands:\n${p}bank insure buy — Purchase insurance\n${p}bank insure status — Check status`
          );
        }
      }

      // -------------------------
      // ROB (steal from another player)
      // -------------------------
      case "rob": {
        const targetId = parseInt(args[1]);
        if (!targetId || targetId === user) {
          return message.reply("✧Please provide a valid target ID to rob.");
        }
        ensureAccount(targetId);
        // check target bank
        if ((bankData[targetId].bank || 0) < 500) {
          return message.reply("✧Target has too little in bank to rob.");
        }
        // chance
        const successChance = 0.35; // 35%
        const success = Math.random() < successChance;
        if (success) {
          const stealAmount = Math.floor((bankData[targetId].bank || 0) * 0.2); // 20%
          bankData[targetId].bank -= stealAmount;
          bankData[user].bank += stealAmount;
          addHistory(user, `🔫 Rob success +${stealAmount}$ from ${targetId}`);
          addHistory(targetId, `🔔 You were robbed -${stealAmount}$ by ${user}`);
          // small karma change
          bankData[user].karma = Math.max(0, (bankData[user].karma || 0) + 1);
          saveBank();
          try {
            await api.sendMessage(`You lost ${stealAmount}$ to a robber (${user})`, targetId);
          } catch (e) {}
          return message.reply(`🔫 Rob success! You stole ${stealAmount}$ from ${targetId}.`);
        } else {
          // failure: lose some money and go to prison short
          const penalty = Math.min(500, bankData[user].bank || 0);
          bankData[user].bank -= penalty;
          bankData[user].prisonUntil = Date.now() + 1000 * 60 * 30; // 30 minutes
          bankData[user].karma = Math.max(0, (bankData[user].karma || 0) - 2);
          addHistory(user, `🔒 Rob failed -${penalty}$ → Prison 30min`);
          saveBank();
          try {
            await api.sendMessage(`⚠️ You were caught while trying to rob and lost ${penalty}$. Prison 30min.`, user);
          } catch (e) {}
          return message.reply(`🔒 Rob failed! You lost ${penalty}$ and got 30 minutes prison.`);
        }
      }

      // -------------------------
      // VAULT (coffre-fort)
      // -------------------------
      case "vault": {
        const sub = args[1]?.toLowerCase();
        if (sub === "deposit") {
          const am = parseInt(args[2]);
          if (isNaN(am) || am <= 0) return message.reply("✧Enter a valid amount to deposit to vault.");
          if (userMoney < am) return message.reply("✧You don't have that much in wallet.");
          bankData[user].vault = (bankData[user].vault || 0) + am;
          await usersData.set(event.senderID, { money: userMoney - am });
          addHistory(user, `🔐 Vault deposit +${am}$`);
          saveBank();
          return message.reply(`🔐 ${am}$ stored in your vault. Safe from heists.`);
        } else if (sub === "withdraw") {
          const am = parseInt(args[2]);
          if (isNaN(am) || am <= 0) return message.reply("✧Enter a valid amount to withdraw from vault.");
          if ((bankData[user].vault || 0) < am) return message.reply("✧Not enough in vault.");
          bankData[user].vault -= am;
          await usersData.set(event.senderID, { money: userMoney + am });
          addHistory(user, `🔓 Vault withdraw -${am}$`);
          saveBank();
          return message.reply(`🔓 ${am}$ withdrawn from your vault to wallet.`);
        } else {
          return message.reply(
            `🔐 Vault commands:\n${p}bank vault deposit [amount]\n${p}bank vault withdraw [amount]\nYour vault: ${bankData[user].vault || 0}$`
          );
        }
      }

      // -------------------------
      // STAKE / BOND (lock investment)
      // -------------------------
      case "bond":
      case "stake": {
        const sub = args[1]?.toLowerCase();
        if (!sub) {
          return message.reply(
            `💹 Bond commands:\n${p}bank bond buy [amount] [hours]\n${p}bank bond list\n${p}bank bond claim [index]`
          );
        }
        if (sub === "buy") {
          const am = parseInt(args[2]);
          const hours = parseInt(args[3]) || 1;
          if (isNaN(am) || am <= 0) return message.reply("✧Enter valid amount.");
          if (userMoney < am) return message.reply("✧You don't have that much in wallet.");
          const rate = 0.05 * hours; // example: 5% per hour
          const end = Date.now() + hours * 3600 * 1000;
          bankData[user].bonds = bankData[user].bonds || [];
          bankData[user].bonds.push({ amount: am, end, rate });
          await usersData.set(event.senderID, { money: userMoney - am });
          addHistory(user, `💼 Bond buy ${am}$ locked ${hours}h @${(rate*100).toFixed(2)}%`);
          saveBank();
          return message.reply(`💼 Bond purchased: ${am}$ locked for ${hours} hour(s).`);
        } else if (sub === "list") {
          const bonds = bankData[user].bonds || [];
          if (!bonds.length) return message.reply("No active bonds.");
          const lines = bonds.map((b, i) => `${i}. ${b.amount}$ ends ${new Date(b.end).toLocaleString()} rate ${b.rate}`);
          return message.reply("Active bonds:\n" + lines.join("\n"));
        } else if (sub === "claim") {
          const idx = parseInt(args[2]);
          const bonds = bankData[user].bonds || [];
          if (isNaN(idx) || idx < 0 || idx >= bonds.length) return message.reply("Invalid bond index.");
          const bond = bonds[idx];
          if (Date.now() < bond.end) return message.reply("This bond is still locked.");
          const payout = Math.floor(bond.amount + bond.amount * bond.rate);
          bankData[user].bonds.splice(idx, 1);
          bankData[user].bank += payout;
          addHistory(user, `💰 Bond claim ${payout}$`);
          saveBank();
          giveAchievement(user, "Bondholder");
          return message.reply(`💰 Bond claimed: ${payout}$ added to your bank.`);
        }
        return;
      }

      // -------------------------
      // DAILY
      // -------------------------
      case "daily": {
        const last = bankData[user].dailyClaim || 0;
        if (Date.now() - last < 1000 * 60 * 60 * 24) {
          const next = new Date(last + 1000 * 60 * 60 * 24).toLocaleString();
          return message.reply(`✧You already claimed daily. Next: ${next}`);
        }
        const reward = 500 + Math.floor(Math.random() * 500); // 500-999
        bankData[user].bank += reward;
        bankData[user].dailyClaim = Date.now();
        addHistory(user, `🎁 Daily claim +${reward}$`);
        saveBank();
        giveAchievement(user, "Daily Player");
        try {
          api.sendMessage(`🎁 You claimed your daily bonus: +${reward}$`, user);
        } catch (e) {}
        return message.reply(`🎁 You collected your daily: ${reward}$`);
      }

      // -------------------------
      // HISTORY
      // -------------------------
      case "history": {
        const hist = bankData[user].history || [];
        if (!hist.length) return message.reply("No history yet.");
        const n = Math.min(10, hist.length);
        const lines = hist.slice(0, n).map(h => `${h.date} • ${h.text}`);
        return message.reply("📜 Last transactions:\n" + lines.join("\n"));
      }

      // -------------------------
      // STATS (advanced)
      // -------------------------
      case "stats": {
        // show user stats or global if admin arg
        if (args[1] && args[1].toLowerCase() === "global") {
          // only VIPs can view global stats for safety
          if (bankData[user].role !== "VIP") return message.reply("Only VIP can view global stats.");
          const all = Object.values(bankData);
          const totalPlayers = all.length;
          const totalMoney = all.reduce((s, a) => s + (a.bank || 0), 0);
          const top = Object.entries(bankData)
            .sort(([, a], [, b]) => (b.bank || 0) - (a.bank || 0))
            .slice(0, 3)
            .map(([id, d], i) => `${i + 1}. ${id} • ${d.bank || 0}$`)
            .join("\n");
          return message.reply(`📊 Bank Global Stats\nPlayers: ${totalPlayers}\nTotal in bank: ${totalMoney}$\nTop 3:\n${top}`);
        } else {
          const d = bankData[user];
          return message.reply(
            `🏦 UCHIWA BANK ACCOUNT 🏦\n━━━━━━━━━━━━━━━\n👤 Name: ${username}\n💰 Wallet (main): ${userMoney}$\n🏛️ Bank: ${d.bank || 0}$\n🔐 Vault: ${d.vault || 0}$\n💸 Loan: ${d.loan || 0}$\n👑 Rank: ${d.role || "Member"}\n🎖️ Achievements: ${(d.achievements || []).join(", ") || "None"}\n❤️ Karma: ${d.karma || 0}\n━━━━━━━━━━━━━━━`
          );
        }
      }

      // -------------------------
      // TOP-UP (admin adjust) -> admin only? We keep for compatibility but comment
      // -------------------------
      case "adminadjust":
      case "admin": {
        // caution: leave as-is but restrict to bot owner ideally. For now require VIP to run.
        if (bankData[user].role !== "VIP") return message.reply("Admin commands restricted.");
        const sub = args[1];
        if (sub === "set") {
          const tgt = parseInt(args[2]);
          const val = parseInt(args[3]);
          ensureAccount(tgt);
          bankData[tgt].bank = val;
          saveBank();
          return message.reply(`Set ${tgt} bank to ${val}$`);
        }
        return message.reply("Admin commands: set [uid] [amount]");
      }

      // -------------------------
      // TOP-LEVEL HELP / DEFAULT
      // -------------------------
      default: {
        return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━\n📲| 𝙿𝚕𝚎𝚊𝚜𝚎 𝚞𝚜𝚎 𝚘𝚗𝚎 𝚘𝚏 𝚝𝚑𝚎 𝚏𝚘𝚕𝚕𝚘𝚠𝚒𝚗𝚐 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚜✧\n✰ ${p}𝐁𝐚𝐧𝐤 𝐃𝐞𝐩𝐨𝐬𝐢𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐖𝐢𝐭𝐡𝐝𝐫𝐚𝐰\n✰ ${p}𝐁𝐚𝐧𝐤 𝐒𝐡𝐨𝐰\n✰ ${p}𝐁𝐚𝐧𝐤 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫\n✰ ${p}𝐁𝐚𝐧𝐤 𝐓𝐨𝐩\n✰ ${p}𝐁𝐚𝐧𝐤 𝐋𝐨𝐚𝐧\n✰ ${p}𝐁𝐚𝐧𝐤 𝐏𝐚𝐲𝐥𝐨𝐚𝐧\n✰ ${p}𝐁𝐚𝐧𝐤 𝐇𝐫𝐢𝐧𝐯𝐞𝐬𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐆𝐚𝐦𝐛𝐥𝐞\n✰ ${p}𝐁𝐚𝐧𝐤 𝐇𝐞𝐢𝐬𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐁𝐚𝐥𝐚𝐧𝐜𝐞\n✰ ${p}𝐁𝐚𝐧𝐤 𝐕𝐈𝐏\n✰ ${p}𝐁𝐚𝐧𝐤 𝗟𝗼𝘁𝘁𝗲𝗿𝘆\n✰ ${p}𝐁𝐚𝐧𝐤 𝗜𝗻𝘀𝘂𝗿𝗲\n✰ ${p}𝐁𝐚𝐧𝐤 𝗥𝗼𝗯\n✰ ${p}𝐁𝐚𝐧𝐤 𝗩𝗮𝘂𝗹𝘁\n✰ ${p}𝐁𝐚𝐧𝐤 𝗕𝗼𝗻𝗱\n✰ ${p}𝐁𝐚𝐧𝐤 𝗗𝗮𝗶𝗹𝘆\n✰ ${p}𝐁𝐚𝐧𝐤 𝗛𝗶𝘀𝘁𝗼𝗿𝘆\n✰ ${p}𝐁𝐚𝐧𝐤 𝗦𝘁𝗮𝘁𝘀\n━━━━━━━━━━━━━━━━\n ===[🏦 𝗣𝗔𝗦𝗦𝗪𝗢𝗥𝗗 🏦]===\n✧𝙿𝚕𝚎𝚊𝚜𝚎 𝚊𝚍𝚍 𝚙𝚊𝚜𝚜𝚠𝚘𝚛𝚍 𝚏𝚘𝚛 𝚜𝚎𝚌𝚞𝚛𝚎 𝚊𝚌𝚌𝚘𝚞𝚗𝚝✧\n✰ ${p}𝗕𝗮𝗻𝗸 𝘀𝗲𝘁𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱\n✰ ${p}𝗕𝗮𝗻𝗸 𝗰𝗵𝗮𝗻𝗴𝗲𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱\n✰ ${p}𝗕𝗮𝗻𝗸 𝗿𝗲𝗺𝗼𝘃𝗲𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱\n━━━━━━━━━━━━━━━━`
        );
      }
    } // end switch
  } // end onStart
}; // end module