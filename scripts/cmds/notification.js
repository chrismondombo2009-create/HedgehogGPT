const { getStreamsFromAttachment } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "notification",
		aliases: ["notify", "noti"],
		version: "2.0",
		author: "NTKhang(patched by L'Uchiha Perdu)",
		countDown: 5,
		role: 2,
		description: {
			en: "Send notification from admin to all groups with styled message and image"
		},
		category: "owner",
		guide: {
			en: "{pn} <message>"
		}
	},

	langs: {
		en: {
			missingMessage: "Please enter the message you want to send to all groups",
			notification: "Notification from admin bot to all chat groups (do not reply to this message)"
		}
	},

	onStart: async function ({ message, api, event, args, threadsData, usersData }) {
		if (!args[0])
			return message.reply("Please enter the message you want to send to all groups");

		const delayPerGroup = 2000;
		const adminName = await usersData.getName(event.senderID);
		const messageText = args.join(" ");
		
		const notificationText = `☛ 〖𝑵𝑶𝑻𝑰𝑭𝑰𝑪𝑨𝑻𝑰𝑶𝑵〗\n━━━━━━━━━━━━━\n➔ ${messageText}\n━━━━━━━━━━━━━\n      ✍〘${adminName}〙`;

		const allThreads = await threadsData.getAll();
		const allThreadID = allThreads.filter(t => t.isGroup && t.members.find(m => m.userID == api.getCurrentUserID()));
		
		const totalGroups = allThreadID.length;
		if (totalGroups === 0)
			return message.reply("No groups found to send notification to.");

		let sendSuccess = 0;
		const sendError = [];
		let currentGroup = 0;
		const startTime = Date.now();

		const getProgressBar = (percent) => {
			const totalBlocks = 20;
			const filledBlocks = Math.round(totalBlocks * (percent / 100));
			const emptyBlocks = totalBlocks - filledBlocks;
			return "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
		};

		const getTimeEstimate = (current, total, start) => {
			const elapsed = (Date.now() - start) / 1000;
			if (current === 0) return "Calculating...";
			const timePerGroup = elapsed / current;
			const remaining = Math.round((total - current) * timePerGroup);
			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			return `${minutes}m ${seconds}s`;
		};

		const createProgressMessage = () => {
			const percent = Math.round((currentGroup / totalGroups) * 100);
			const progressBar = getProgressBar(percent);
			const timeRemaining = getTimeEstimate(currentGroup, totalGroups, startTime);
			const successRate = currentGroup > 0 ? Math.round((sendSuccess / currentGroup) * 100) : 0;
			
			return `📤 Notification en cours...\n━━━━━━━━━━━━━━━━━━━━\n📊 Progression : ${currentGroup}/${totalGroups} groupes\n⏱ Temps restant : ~${timeRemaining}\n━━━━━━━━━━━━━━━━━━━━\n🔄 Chargement : [${progressBar}] ${percent}%\n━━━━━━━━━━━━━━━━━━━━\n📝 Statut : Envoi en cours...\n✅ Groupes réussis : ${sendSuccess}\n❌ Échecs : ${sendError.length}\n🎯 Taux de succès : ${successRate}%`;
		};

		const initialMessage = await message.reply(createProgressMessage());
		const messageID = initialMessage.messageID;

		for (const thread of allThreadID) {
			currentGroup++;
			const tid = thread.threadID;
			
			try {
				await api.sendMessage(notificationText, tid);
				
				const notificationImage = await this.createNotificationCanvas(messageText, adminName);
				const imagePath = path.join(__dirname, `tmp_notif_${tid}_${Date.now()}.png`);
				fs.writeFileSync(imagePath, notificationImage);
				
				await api.sendMessage({ attachment: fs.createReadStream(imagePath) }, tid);
				
				fs.unlinkSync(imagePath);
				sendSuccess++;
			}
			catch (e) {
				const errorDescription = e.message || "Unknown error";
				const existingError = sendError.find(item => item.errorDescription == errorDescription);
				if (existingError)
					existingError.threadIDs.push(tid);
				else
					sendError.push({
						threadIDs: [tid],
						errorDescription
					});
			}

			if (currentGroup % 3 === 0 || currentGroup === totalGroups) {
				await api.editMessage(createProgressMessage(), messageID, event.threadID);
			}
			
			if (currentGroup < totalGroups) {
				await new Promise(resolve => setTimeout(resolve, delayPerGroup));
			}
		}

		const totalTime = Math.round((Date.now() - startTime) / 1000);
		const minutes = Math.floor(totalTime / 60);
		const seconds = totalTime % 60;
		const successRate = Math.round((sendSuccess / totalGroups) * 100);

		const finalMessage = `📤 Notification terminée ! ✅\n━━━━━━━━━━━━━━━━━━━━\n📊 Progression : ${totalGroups}/${totalGroups} groupes\n⏱ Temps total : ${minutes}m ${seconds}s\n━━━━━━━━━━━━━━━━━━━━\n🔄 Chargement : [${getProgressBar(100)}] 100%\n━━━━━━━━━━━━━━━━━━━━\n📝 Résumé final :\n✅ Groupes réussis : ${sendSuccess}\n❌ Échecs : ${sendError.length}\n🎯 Taux de succès : ${successRate}%`;

		await api.editMessage(finalMessage, messageID, event.threadID);

		if (sendError.length > 0) {
			let errorMsg = "\n\n📋 Détails des erreurs :";
			sendError.forEach(error => {
				errorMsg += `\n\n❌ ${error.errorDescription}`;
				errorMsg += `\n📌 Groupes : ${error.threadIDs.slice(0, 3).join(", ")}`;
				if (error.threadIDs.length > 3) {
					errorMsg += `\n   + ...et ${error.threadIDs.length - 3} autres`;
				}
			});
			await message.reply(errorMsg);
		}

		const reportImage = await this.createReportCanvas(sendSuccess, sendError.reduce((a, b) => a + b.threadIDs.length, 0), totalGroups);
		const reportPath = path.join(__dirname, `tmp_report_${Date.now()}.png`);
		fs.writeFileSync(reportPath, reportImage);
		
		await message.reply({ attachment: fs.createReadStream(reportPath) });
		fs.unlinkSync(reportPath);
	},

	createNotificationCanvas: async function (message, adminName) {
		const tempCanvas = Canvas.createCanvas(1, 1);
		const tempCtx = tempCanvas.getContext('2d');
		tempCtx.font = "30px Arial";
		
		const lines = this.wrapText(tempCtx, message, 1100, 30, 6);
		const lineHeight = 45;
		const textHeight = lines.length * lineHeight;
		
		const W = 1200;
		const H = Math.min(800, Math.max(500, 350 + textHeight));
		
		const canvas = Canvas.createCanvas(W, H);
		const ctx = canvas.getContext('2d');
		
		const grd = ctx.createLinearGradient(0, 0, W, H);
		grd.addColorStop(0, "#1a237e");
		grd.addColorStop(1, "#00e5ff");
		ctx.fillStyle = grd;
		ctx.fillRect(0, 0, W, H);

		ctx.fillStyle = "rgba(255,255,255,0.15)";
		ctx.beginPath();
		ctx.ellipse(W / 2, 120, 100, 100, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.font = "bold 85px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText("📢", W / 2, 165);

		ctx.font = "bold 48px Arial";
		ctx.fillText("NOTIFICATION", W / 2, 250);

		ctx.font = "32px Arial";
		ctx.fillStyle = "rgba(255,255,255,0.95)";
		
		lines.forEach((line, i) => {
			ctx.fillText(line, W / 2, 320 + i * lineHeight);
		});

		ctx.fillStyle = "rgba(0,0,0,0.25)";
		ctx.fillRect(0, H - 90, W, 90);
		
		ctx.fillStyle = "#FFD700";
		ctx.font = "28px Arial";
		ctx.fillText(`Admin: ${adminName}`, W / 2, H - 40);

		return canvas.toBuffer();
	},

	createReportCanvas: async function (success, failed, total) {
		const W = 1000;
		const H = 600;
		const canvas = Canvas.createCanvas(W, H);
		const ctx = canvas.getContext('2d');
		
		const grd = ctx.createLinearGradient(0, 0, W, H);
		grd.addColorStop(0, "#0a0a0a");
		grd.addColorStop(1, "#1a1a2e");
		ctx.fillStyle = grd;
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 65px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText("📊 REPORT", W / 2, 100);

		const centerX = W / 2;
		
		ctx.font = "bold 50px Arial";
		ctx.fillStyle = "#00FF88";
		ctx.fillText(`${success} ✓`, centerX - 180, 220);
		
		ctx.fillStyle = "#FF4444";
		ctx.fillText(`${failed} ✗`, centerX + 180, 220);

		ctx.font = "35px Arial";
		ctx.fillStyle = "#AAAAAA";
		ctx.fillText(`Total: ${total} groups`, centerX, 280);

		const successPercent = total > 0 ? Math.round((success / total) * 100) : 0;
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "40px Arial";
		ctx.fillText(`Success Rate: ${successPercent}%`, centerX, 350);

		ctx.fillStyle = "rgba(255,255,255,0.1)";
		ctx.fillRect(0, H - 70, W, 70);
		
		ctx.fillStyle = "#888888";
		ctx.font = "20px Arial";
		ctx.textAlign = "center";
		ctx.fillText(new Date().toLocaleString("en-US"), W / 2, H - 30);

		return canvas.toBuffer();
	},

	wrapText: function (ctx, text, maxWidth, fontSize, maxLines = 6) {
		ctx.font = `${fontSize}px Arial`;
		const words = text.split(' ');
		const lines = [];
		let currentLine = words[0];

		for (let i = 1; i < words.length; i++) {
			const word = words[i];
			const width = ctx.measureText(currentLine + " " + word).width;
			if (width < maxWidth) {
				currentLine += " " + word;
			} else {
				lines.push(currentLine);
				currentLine = word;
			}
		}
		lines.push(currentLine);

		if (lines.length > maxLines) {
			let truncated = lines.slice(0, maxLines);
			let lastLine = truncated[maxLines - 1];
			
			while (ctx.measureText(lastLine + "...").width > maxWidth && lastLine.length > 0) {
				lastLine = lastLine.substring(0, lastLine.length - 1);
			}
			truncated[maxLines - 1] = lastLine + "...";
			return truncated;
		}

		return lines;
	}
};