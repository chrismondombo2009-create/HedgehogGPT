const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { spawn } = require('child_process');
const crypto = require('crypto');

const BALANCE_FILE = path.join(__dirname, 'balance.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const SECURITY_FILE = path.join(__dirname, 'security.json');
const TEMP_DIR = path.join(__dirname, 'temp_bank_system');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function initFiles() {
    if (!fs.existsSync(BALANCE_FILE)) fs.writeFileSync(BALANCE_FILE, '{}');
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
    if (!fs.existsSync(SECURITY_FILE)) fs.writeFileSync(SECURITY_FILE, '{"transactions":[],"attempts":{}}');
}
initFiles();

function loadBalance() { return JSON.parse(fs.readFileSync(BALANCE_FILE, 'utf8') || '{}'); }
function loadUsers() { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}'); }
function loadSecurity() { return JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf8') || '{}'); }
function saveBalance(data) { fs.writeFileSync(BALANCE_FILE, JSON.stringify(data, null, 2)); }
function saveUsers(data) { fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2)); }
function saveSecurity(data) { fs.writeFileSync(SECURITY_FILE, JSON.stringify(data, null, 2)); }

function formatNumber(number) {
    const suffixes = ["", "K", "M", "B", "T", "Q", "Qt", "Sx", "Sp", "O", "N", "D"];
    if (number < 1000) return number.toString();
    const exp = Math.floor(Math.log10(number) / 3);
    const short = number / Math.pow(1000, exp);
    return `${short.toFixed(2)}${suffixes[exp]}`;
}

async function getUserName(uid, api) {
    try {
        const info = await api.getUserInfo([uid]);
        return info[uid]?.name || `𝐔𝐬𝐞𝐫_${uid}`;
    } catch { return `𝐔𝐬𝐞𝐫_${uid}`; }
}

function getBorder() { return "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n"; }

const DISPLAY_MODES = { TEXT: 'text', IMAGE: 'image', VIDEO: 'video' };
const loans = {};
const COOLDOWNS = {};

const VIDEO_COMMANDS = new Set(['solde', 'depot', 'retrait', 'pret', 'transfert', 'vip', 'gamble', 'heist', 'daily', 'dette', 'rembourser', 'vault', 'insure', 'investir']);

function createImageFrame(width, height, type, data, frameIndex = 0, totalFrames = 1, animationProgress = 0) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0c0c1d');
    bgGradient.addColorStop(0.5, '#15152b');
    bgGradient.addColorStop(1, '#1a1a35');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 150; i++) {
        const alpha = 0.02 + Math.random() * 0.04;
        const size = 0.5 + Math.random() * 2;
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    const neonGradient = ctx.createLinearGradient(0, 0, width, 0);
    neonGradient.addColorStop(0, '#00ffff');
    neonGradient.addColorStop(0.5, '#0080ff');
    neonGradient.addColorStop(1, '#00ffff');

    ctx.strokeStyle = neonGradient;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(40, 30, width - 80, height - 60);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    ctx.fillRect(60, 50, width - 120, height - 100);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 42px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#0080ff';
    ctx.shadowBlur = 15;
    ctx.fillText('🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦', width / 2, 110);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#a0a0ff';
    ctx.font = '20px "Segoe UI", Arial';
    ctx.fillText('𝐒𝐲𝐬𝐭è𝐦𝐞 𝐁𝐚𝐧𝐜𝐚𝐢𝐫𝐞 𝐔𝐥𝐭𝐢𝐦𝐞', width / 2, 145);

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 120, 155);
    ctx.lineTo(width / 2 + 120, 155);
    ctx.stroke();

    const iconMap = {
        'solde': '💰', 'depot': '📥', 'retrait': '📤', 'pret': '🏦', 'transfert': '🔄',
        'vip': '👑', 'gamble': '🎰', 'heist': '💰', 'vault': '🔐', 'top': '🏆',
        'daily': '🎉', 'stats': '📊', 'menu': '📋', 'error': '❌', 'security': '🔒',
        'success': '✅', 'warning': '⚠️', 'info': 'ℹ️', 'loan': '📝', 'debt': '🎯',
        'dette': '🎯', 'rembourser': '💳', 'investir': '📈', 'insure': '🛡️'
    };

    const titleMap = {
        'solde': '𝐒𝐎𝐋𝐃𝐄 𝐃𝐔 𝐂𝐎𝐌𝐏𝐓𝐄',
        'depot': '𝐃É𝐏Ô𝐓 𝐑É𝐔𝐒𝐒𝐈',
        'retrait': '𝐑𝐄𝐓𝐑𝐀𝐈𝐓 𝐄𝐅𝐅𝐄𝐂𝐓𝐔É',
        'pret': '𝐏𝐑Ê𝐓 𝐀𝐂𝐂𝐎𝐑𝐃É',
        'transfert': '𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐓 𝐂𝐎𝐌𝐏𝐋𝐄𝐓',
        'vip': '𝐒𝐓𝐀𝐓𝐔𝐓 𝐕𝐈𝐏',
        'gamble': '𝐉𝐄𝐔 𝐃𝐄 𝐇𝐀𝐒𝐀𝐑𝐃',
        'heist': '𝐁𝐑𝐀𝐐𝐔𝐀𝐆𝐄',
        'vault': '𝐂𝐎𝐅𝐅𝐑𝐄-𝐅𝐎𝐑𝐓',
        'top': '𝐂𝐋𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓',
        'daily': '𝐑É𝐂𝐎𝐌𝐏𝐄𝐍𝐒𝐄 𝐐𝐔𝐎𝐓𝐈𝐃𝐈𝐄𝐍𝐍𝐄',
        'stats': '𝐒𝐓𝐀𝐓𝐈𝐒𝐓𝐈𝐐𝐔𝐄𝐒',
        'menu': '𝐌𝐄𝐍𝐔 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋',
        'error': '𝐄𝐑𝐑𝐄𝐔𝐑',
        'security': '𝐒É𝐂𝐔𝐑𝐈𝐓É',
        'success': '𝐒𝐔𝐂𝐂È𝐒',
        'warning': '𝐀𝐕𝐄𝐑𝐓𝐈𝐒𝐒𝐄𝐌𝐄𝐍𝐓',
        'info': '𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍',
        'loan': '𝐏𝐑Ê𝐓',
        'debt': '𝐃𝐄𝐓𝐓𝐄',
        'dette': '𝐃𝐄𝐓𝐓𝐄',
        'rembourser': '𝐑𝐄𝐌𝐁𝐎𝐔𝐑𝐒𝐄𝐌𝐄𝐍𝐓',
        'investir': '𝐈𝐍𝐕𝐄𝐒𝐓𝐈𝐒𝐒𝐄𝐌𝐄𝐍𝐓',
        'insure': '𝐀𝐒𝐒𝐔𝐑𝐀𝐍𝐂𝐄'
    };

    const icon = iconMap[type] || '🏦';
    const title = titleMap[type] || '𝐁𝐀𝐍𝐐𝐔𝐄 𝐔𝐂𝐇𝐈𝐖𝐀';
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Segoe UI", Arial';
    ctx.fillText(`${icon} ${title}`, width / 2, 200);

    ctx.strokeStyle = '#0080ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 120, 210);
    ctx.lineTo(width / 2 + 120, 210);
    ctx.stroke();

    let y = 250;
    ctx.textAlign = 'left';
    ctx.font = '26px "Segoe UI", Arial';

    const renderData = {
        'solde': () => {
            ctx.fillStyle = '#cccccc';
            ctx.fillText(`👤 𝐔𝐭𝐢𝐥𝐢𝐬𝐚𝐭𝐞𝐮𝐫: ${data.userName}`, 100, y);
            ctx.fillText(`🔢 𝐔𝐈𝐃: ${data.userId}`, 100, y + 45);
            ctx.fillText(`💸 𝐂𝐚𝐬𝐡: ${formatNumber(data.cash)}💲`, 100, y + 90);
            ctx.fillText(`🏦 𝐁𝐚𝐧𝐪𝐮𝐞: ${formatNumber(data.bank)}💲`, 100, y + 135);
            ctx.fillText(`📈 𝐈𝐧𝐭é𝐫ê𝐭𝐬: ${data.vip ? '20% 🌟' : '5%'}`, 100, y + 180);
            ctx.fillText(`🎯 𝐃𝐞𝐭𝐭𝐞: ${formatNumber(data.debt)}💲`, 100, y + 225);
            ctx.fillText(`🛡️ 𝐀𝐬𝐬𝐮𝐫𝐚𝐧𝐜𝐞: ${data.insurance ? '𝐀𝐂𝐓𝐈𝐕𝐄' : '𝐈𝐍𝐀𝐂𝐓𝐈𝐕𝐄'}`, 100, y + 270);
            ctx.fillText(`👑 𝐒𝐭𝐚𝐭𝐮𝐭: ${data.vip ? '𝐕𝐈𝐏 🌟' : '𝐒𝐭𝐚𝐧𝐝𝐚𝐫𝐝'}`, 100, y + 315);
        },
        'depot': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 40px "Segoe UI", Arial';
            ctx.fillStyle = '#00ff80';
            ctx.fillText(`+${formatNumber(data.amount)}💲`, width / 2, y + 70);
            ctx.font = '28px "Segoe UI", Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('𝐃É𝐏Ô𝐓 𝐑É𝐔𝐒𝐒𝐈', width / 2, y + 130);
            ctx.fillText(`𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞: ${formatNumber(data.newBalance)}💲`, width / 2, y + 190);
        },
        'retrait': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 40px "Segoe UI", Arial';
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(`-${formatNumber(data.amount)}💲`, width / 2, y + 70);
            ctx.font = '28px "Segoe UI", Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('𝐑𝐄𝐓𝐑𝐀𝐈𝐓 𝐄𝐅𝐅𝐄𝐂𝐓𝐔É', width / 2, y + 130);
            ctx.fillText(`𝐂𝐚𝐬𝐡 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞: ${formatNumber(data.cash)}💲`, width / 2, y + 190);
        },
        'pret': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 40px "Segoe UI", Arial';
            ctx.fillStyle = '#ffff00';
            ctx.fillText(`+${formatNumber(data.amount)}💲`, width / 2, y + 70);
            ctx.font = '28px "Segoe UI", Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('𝐏𝐑Ê𝐓 𝐀𝐂𝐂𝐎𝐑𝐃É', width / 2, y + 130);
            ctx.fillText(`𝐃𝐞𝐭𝐭𝐞 𝐭𝐨𝐭𝐚𝐥𝐞: ${formatNumber(data.debt)}💲`, width / 2, y + 190);
            ctx.fillStyle = '#ff5555';
            ctx.fillText(`⚠️ 𝐑𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐳 ${formatNumber(data.half)}💲 𝐝𝐚𝐧𝐬 30𝐦𝐢𝐧!`, width / 2, y + 250);
        },
        'dette': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px "Segoe UI", Arial';
            ctx.fillStyle = '#ff5555';
            ctx.fillText('𝐃𝐄𝐓𝐓𝐄 𝐄𝐍 𝐂𝐎𝐔𝐑𝐒', width / 2, y + 70);
            ctx.font = '28px "Segoe UI", Arial';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(`𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(data.amount)}💲`, width / 2, y + 130);
            ctx.fillText(`𝐓𝐞𝐦𝐩𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${data.time}𝐦𝐢𝐧`, width / 2, y + 180);
            ctx.fillText(`𝐒𝐭𝐚𝐭𝐮𝐭: ${data.status}`, width / 2, y + 230);
            if (data.remaining) {
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(`𝐑𝐞𝐬𝐭𝐞 à 𝐫𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐫: ${formatNumber(data.remaining)}💲`, width / 2, y + 280);
            }
        },
        'vip': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px "Segoe UI", Arial';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('🌟 𝐕𝐈𝐏 𝐀𝐂𝐓𝐈𝐕É 🌟', width / 2, y + 70);
            ctx.font = '24px "Segoe UI", Arial';
            const advantages = [
                '📈 𝐈𝐧𝐭é𝐫ê𝐭𝐬: 20% (𝐚𝐮 𝐥𝐢𝐞𝐮 𝐝𝐞 5%)',
                '🏦 𝐏𝐫ê𝐭 𝐦𝐚𝐱: 4,000,000💲',
                '🔄 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫𝐭 𝐦𝐚𝐱: 10𝐌💲/𝐣𝐨𝐮𝐫',
                '🛡️ 𝐏𝐚𝐬 𝐝𝐞 𝐩é𝐧𝐚𝐥𝐢𝐭é𝐬 𝐝𝐞 𝐝𝐞𝐭𝐭𝐞',
                '🎰 𝐀𝐜𝐜è𝐬 𝐞𝐱𝐜𝐥𝐮𝐬𝐢𝐟 𝐚𝐮 𝐜𝐚𝐬𝐢𝐧𝐨'
            ];
            for (let i = 0; i < advantages.length; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#00ff80' : '#00aaff';
                ctx.fillText(advantages[i], width / 2, y + 130 + i * 50);
            }
        },
        'error': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px "Segoe UI", Arial';
            ctx.fillStyle = '#ff5555';
            ctx.fillText('❌ 𝐄𝐑𝐑𝐄𝐔𝐑', width / 2, y + 70);
            ctx.font = '26px "Segoe UI", Arial';
            ctx.fillStyle = '#ffffff';
            if (data.message) {
                const lines = data.message.split('\n');
                for (let i = 0; i < Math.min(lines.length, 4); i++) {
                    ctx.fillText(lines[i], width / 2, y + 130 + i * 60);
                }
            }
        },
        'success': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px "Segoe UI", Arial';
            ctx.fillStyle = '#00ff80';
            ctx.fillText('✅ 𝐒𝐔𝐂𝐂È𝐒', width / 2, y + 70);
            ctx.font = '26px "Segoe UI", Arial';
            ctx.fillStyle = '#ffffff';
            if (data.message) {
                const lines = data.message.split('\n');
                for (let i = 0; i < Math.min(lines.length, 4); i++) {
                    ctx.fillText(lines[i], width / 2, y + 130 + i * 60);
                }
            }
        },
        'default': () => {
            ctx.textAlign = 'left';
            ctx.font = '26px "Segoe UI", Arial';
            const entries = Object.entries(data);
            for (const [key, value] of entries.slice(0, 8)) {
                ctx.fillStyle = '#aaaaaa';
                ctx.fillText(`${key}:`, 100, y);
                ctx.fillStyle = '#00aaff';
                ctx.textAlign = 'right';
                ctx.fillText(value, width - 100, y);
                ctx.textAlign = 'left';
                y += 50;
            }
        }
    };

    if (renderData[type]) {
        renderData[type]();
    } else {
        renderData.default();
    }

    if (type.startsWith('video_')) {
        const terminalWidth = 600;
        const terminalHeight = 200;
        const terminalX = (width - terminalWidth) / 2;
        const terminalY = height - 280;
        
        ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
        ctx.fillRect(terminalX, terminalY, terminalWidth, terminalHeight);
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(terminalX, terminalY, terminalWidth, terminalHeight);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '18px "Courier New", monospace';
        ctx.textAlign = 'left';
        
        const prompt = `𝐔𝐂𝐇𝐈𝐖𝐀@𝐁𝐀𝐍𝐊:~$ ${data.command}`;
        const typedChars = Math.floor(prompt.length * animationProgress);
        const displayText = prompt.substring(0, typedChars);
        
        ctx.fillText(displayText, terminalX + 20, terminalY + 40);
        
        if (animationProgress < 1 && frameIndex % 2 === 0) {
            ctx.fillText('█', terminalX + 20 + ctx.measureText(displayText).width, terminalY + 40);
        }
        
        if (data.password) {
            const masked = '•'.repeat(data.password.length * animationProgress);
            ctx.fillText(`𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞: ${masked}`, terminalX + 20, terminalY + 80);
        }
    }

    if (totalFrames > 1) {
        const progress = (frameIndex + 1) / totalFrames;
        ctx.fillStyle = '#333333';
        ctx.fillRect(100, height - 80, width - 200, 20);
        ctx.fillStyle = '#00ff80';
        ctx.fillRect(100, height - 80, (width - 200) * progress, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Segoe UI", Arial';
        ctx.fillText(`𝐅𝐫𝐚𝐦𝐞 ${frameIndex + 1}/${totalFrames}`, width / 2, height - 65);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.font = '18px "Segoe UI", Arial';
    ctx.fillText(`𝐔𝐈𝐃: ${data.userId || '𝐍/𝐀'} | ${new Date().toLocaleString()}`, width / 2, height - 30);

    return canvas.toBuffer('image/png');
}

async function generateImageForAll(type, data, userId, userName) {
    const width = 1200, height = 800;
    const imageData = { userId, userName, ...data };
    return createImageFrame(width, height, type, imageData);
}

async function generateVideoForAll(type, data, userId, userName) {
    const videoId = Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const videoDir = path.join(TEMP_DIR, videoId);
    fs.mkdirSync(videoDir, { recursive: true });

    const totalFrames = 120;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i++) {
        const animationProgress = Math.min(1, i / 60);
        const frameData = { 
            ...data, 
            userId, 
            userName, 
            progress: i / totalFrames,
            frameIndex: i,
            command: data.videoCommand || type,
            animationProgress: animationProgress
        };
        
        const frameBuffer = createImageFrame(1280, 720, `video_${type}`, frameData, i, totalFrames, animationProgress);
        const framePath = path.join(videoDir, `frame_${String(i).padStart(5, '0')}.png`);
        fs.writeFileSync(framePath, frameBuffer);
        frames.push(framePath);
    }

    const videoPath = path.join(videoDir, 'output.mp4');
    await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-framerate', '30',
            '-i', path.join(videoDir, 'frame_%05d.png'),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '18',
            '-preset', 'medium',
            '-vf', 'scale=1280:720',
            '-y', videoPath
        ]);
        
        ffmpeg.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`𝐅𝐅𝐦𝐩𝐞𝐠 𝐞𝐫𝐫𝐞𝐮𝐫: ${code}`));
        });
        
        ffmpeg.stderr.on('data', () => {});
        ffmpeg.stdout.on('data', () => {});
    });

    frames.forEach(frame => {
        try { fs.unlinkSync(frame); } catch {}
    });

    const videoBuffer = fs.readFileSync(videoPath);
    
    setTimeout(() => {
        try { fs.rmSync(videoDir, { recursive: true, force: true }); } catch {}
    }, 60000);

    return videoBuffer;
}

async function sendResponse(message, type, data, mode, api, event, userName) {
    const userId = event.senderID;

    if (mode === DISPLAY_MODES.IMAGE || (mode === DISPLAY_MODES.VIDEO && !VIDEO_COMMANDS.has(type))) {
        try {
            const imageBuffer = await generateImageForAll(type, data, userId, userName);
            const tempImage = path.join(TEMP_DIR, `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
            fs.writeFileSync(tempImage, imageBuffer);
            
            const finalMessage = mode === DISPLAY_MODES.VIDEO && !VIDEO_COMMANDS.has(type) ? 
                message + '\n\n📸 𝐂𝐞𝐭𝐭𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐞 𝐞𝐬𝐭 𝐞𝐧 𝐦𝐨𝐝𝐞 𝐢𝐦𝐚𝐠𝐞 𝐮𝐧𝐢𝐪𝐮𝐞𝐦𝐞𝐧𝐭.' : 
                message;
            
            await api.sendMessage({ 
                body: finalMessage, 
                attachment: fs.createReadStream(tempImage) 
            }, event.threadID);
            
            setTimeout(() => {
                try { fs.unlinkSync(tempImage); } catch {}
            }, 15000);
            
        } catch (error) {
            console.error('𝐄𝐫𝐫𝐞𝐮𝐫 𝐠é𝐧é𝐫𝐚𝐭𝐢𝐨𝐧 𝐢𝐦𝐚𝐠𝐞:', error);
            await api.sendMessage(message, event.threadID);
        }
    } else if (mode === DISPLAY_MODES.VIDEO && VIDEO_COMMANDS.has(type)) {
        try {
            const videoData = { ...data, videoCommand: `bank ${type}` };
            const videoBuffer = await generateVideoForAll(type, videoData, userId, userName);
            const tempVideo = path.join(TEMP_DIR, `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`);
            fs.writeFileSync(tempVideo, videoBuffer);
            
            await api.sendMessage({ 
                body: message, 
                attachment: fs.createReadStream(tempVideo) 
            }, event.threadID);
            
            setTimeout(() => {
                try { fs.unlinkSync(tempVideo); } catch {}
            }, 45000);
            
        } catch (error) {
            console.error('𝐄𝐫𝐫𝐞𝐮𝐫 𝐠é𝐧é𝐫𝐚𝐭𝐢𝐨𝐧 𝐯𝐢𝐝é𝐨:', error);
            try {
                const imageBuffer = await generateImageForAll(type, data, userId, userName);
                const tempImage = path.join(TEMP_DIR, `fallback_${Date.now()}.png`);
                fs.writeFileSync(tempImage, imageBuffer);
                
                await api.sendMessage({ 
                    body: message + '\n\n⚠️ 𝐋𝐚 𝐯𝐢𝐝é𝐨 𝐚 é𝐜𝐡𝐨𝐮é, 𝐯𝐨𝐢𝐜𝐢 𝐮𝐧𝐞 𝐢𝐦𝐚𝐠𝐞.', 
                    attachment: fs.createReadStream(tempImage) 
                }, event.threadID);
                
                setTimeout(() => {
                    try { fs.unlinkSync(tempImage); } catch {}
                }, 15000);
            } catch (imgError) {
                await api.sendMessage(message, event.threadID);
            }
        }
    } else {
        await api.sendMessage(message, event.threadID);
    }
}

async function checkLoanRepayment(userId, api, lang = 'fr') {
    const loan = loans[userId];
    if (!loan) return;

    const balance = loadBalance();
    const users = loadUsers();
    const userBalance = balance[userId] || { bank: 0, cash: 0, debt: 0 };
    const isVIP = users[userId]?.vip || false;
    const halfDebt = loan.amount / 2;
    const now = Date.now();
    const timePassed = now - loan.timestamp;

    if (timePassed >= 30 * 60 * 1000) {
        if (userBalance.debt > halfDebt) {
            const lostCash = Math.min(userBalance.cash, halfDebt);
            const lostBank = Math.min(userBalance.bank, halfDebt - lostCash);
            userBalance.cash -= lostCash;
            userBalance.bank -= lostBank;
            userBalance.debt = Math.max(0, userBalance.debt - (lostCash + lostBank));
            
            const sanctionMsg = `${getBorder()}✧ 𝐒𝐀𝐍𝐂𝐓𝐈𝐎𝐍: ${await getUserName(userId, api)} 𝐧'𝐚 𝐩𝐚𝐬 𝐫𝐞𝐦𝐛𝐨𝐮𝐫𝐬é!\n✧ 𝐂𝐨𝐧𝐟𝐢𝐬𝐜𝐚𝐭𝐢𝐨𝐧: ${formatNumber(lostCash + lostBank)}💲\n✧ 𝐃𝐞𝐭𝐭𝐞 𝐫𝐞𝐬𝐭𝐚𝐧𝐭𝐞: ${formatNumber(userBalance.debt)}💲\n━━━━━━━━━━━━━━━━`;
            
            if (!isVIP) {
                try {
                    const groups = await api.getThreadList(100, null, ['INBOX']);
                    const userGroups = groups.filter(g => g.isGroup);
                    const shameMsg = `🚨 𝐀𝐋𝐄𝐑𝐓𝐄 𝐃É𝐁𝐈𝐓𝐄𝐔𝐑!\n${await getUserName(userId, api)} 𝐚 é𝐜𝐡𝐨𝐮é à 𝐫𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐫 ${formatNumber(halfDebt)}💲!\n𝐄𝐯𝐢𝐭𝐞𝐳 𝐥𝐞𝐬 𝐭𝐫𝐚𝐧𝐬𝐚𝐜𝐭𝐢𝐨𝐧𝐬 𝐚𝐯𝐞𝐜 𝐜𝐞𝐭 𝐮𝐭𝐢𝐥𝐢𝐬𝐚𝐭𝐞𝐮𝐫.\n━━━━━━━━━━━━━━━━`;
                    
                    let sent = 0;
                    for (const group of userGroups) {
                        if (sent >= 3) break;
                        try {
                            await api.sendMessage(shameMsg, group.threadID);
                            sent++;
                        } catch {}
                    }
                } catch {}
            }
            
            await api.sendMessage(sanctionMsg, loan.threadID);
            
            if (userBalance.debt > 0) {
                loans[userId] = { ...loan, stage: 2, timestamp: now };
                setTimeout(() => checkLoanRepayment(userId, api, lang), 30 * 60 * 1000);
            } else {
                delete loans[userId];
            }
        } else {
            loans[userId] = { ...loan, stage: 2, timestamp: now };
            const warningMsg = `${getBorder()}✧ 𝐑𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐦𝐞𝐧𝐭 𝐩𝐚𝐫𝐭𝐢𝐞𝐥 𝐚𝐜𝐜𝐞𝐩𝐭é!\n✧ 𝐈𝐥 𝐫𝐞𝐬𝐭𝐞 ${formatNumber(userBalance.debt)}💲 à 𝐩𝐚𝐲𝐞𝐫.\n✧ 𝐃é𝐥𝐚𝐢: 30 𝐦𝐢𝐧𝐮𝐭𝐞𝐬 𝐬𝐮𝐩𝐩𝐥é𝐦𝐞𝐧𝐭𝐚𝐢𝐫𝐞𝐬.\n━━━━━━━━━━━━━━━━`;
            await api.sendMessage(warningMsg, loan.threadID);
            setTimeout(() => checkLoanRepayment(userId, api, lang), 30 * 60 * 1000);
        }
        saveBalance(balance);
    }
}

const LANG = {
    fr: {
        menu: `${getBorder()}✧ 𝐂𝐡𝐨𝐢𝐬𝐢𝐬𝐬𝐞𝐳 𝐮𝐧𝐞 𝐨𝐩𝐭𝐢𝐨𝐧:\n\n💰 𝐅𝐢𝐧𝐚𝐧𝐜𝐞:\n➤ ~bank solde [motdepasse]\n➤ ~bank déposer [montant] [motdepasse]\n➤ ~bank retirer [montant] [motdepasse]\n➤ ~bank transfer [uid] [montant] [motdepasse]\n\n🏦 𝐏𝐫ê𝐭𝐬:\n➤ ~bank prêt [montant] [motdepasse]\n➤ ~bank dette [motdepasse]\n➤ ~bank rembourser [montant] [motdepasse]\n\n🎯 𝐈𝐧𝐯𝐞𝐬𝐭𝐢𝐬𝐬𝐞𝐦𝐞𝐧𝐭𝐬:\n➤ ~bank investir [montant]\n➤ ~bank hrinvest [montant]\n➤ ~bank crypto [montant]\n\n🎰 𝐉𝐞𝐮 & 𝐑𝐢𝐬𝐪𝐮𝐞:\n➤ ~bank gamble [montant] [motdepasse]\n➤ ~bank casino [montant]\n➤ ~bank heist [cible]\n➤ ~bank loterie buy\n\n🛡️ 𝐒é𝐜𝐮𝐫𝐢𝐭é:\n➤ ~bank setpassword [motdepasse]\n➤ ~bank changepassword [nouveau] [ancien]\n➤ ~bank removepassword [motdepasse]\n➤ ~bank vault deposit [montant]\n➤ ~bank vault withdraw [montant]\n➤ ~bank insure buy\n\n👑 𝐕𝐈𝐏 & 𝐒𝐭𝐚𝐭𝐮𝐭:\n➤ ~bank vip\n➤ ~bank vip list\n➤ ~bank leaderboard\n➤ ~bank achievements\n\n⚙️ 𝐂𝐨𝐧𝐟𝐢𝐠𝐮𝐫𝐚𝐭𝐢𝐨𝐧:\n➤ ~bank mode text/image/video\n➤ ~bank language fr/en\n➤ ~bank stats [global]\n\n🔧 𝐀𝐝𝐦𝐢𝐧 (é𝐥𝐢𝐭𝐞):\n➤ ~bank admin set [uid] [valeur]\n➤ ~bank admin vip [uid]\n➤ ~bank admin prison [uid] [minutes]\n━━━━━━━━━━━━━━━━`,
        solde: (bank, cash, debt, vip) => `${getBorder()}✧ 𝐕𝐨𝐭𝐫𝐞 𝐬𝐨𝐥𝐝𝐞:\n\n💰 𝐂𝐚𝐬𝐡: ${formatNumber(cash)}💲\n🏦 𝐁𝐚𝐧𝐪𝐮𝐞: ${formatNumber(bank)}💲\n📈 𝐈𝐧𝐭é𝐫ê𝐭𝐬: ${vip ? '20% 🌟' : '5%'}\n🎯 𝐃𝐞𝐭𝐭𝐞: ${formatNumber(debt)}💲${vip ? '\n👑 𝐒𝐭𝐚𝐭𝐮𝐭: 𝐕𝐈𝐏 🌟' : ''}\n━━━━━━━━━━━━━━━━`,
        depositSuccess: (amount, balance) => `${getBorder()}✧ 𝐃é𝐩ô𝐭 𝐫é𝐮𝐬𝐬𝐢!\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐬𝐨𝐥𝐝𝐞: ${formatNumber(balance)}💲\n━━━━━━━━━━━━━━━━`,
        withdrawSuccess: (amount, cash) => `${getBorder()}✧ 𝐑𝐞𝐭𝐫𝐚𝐢𝐭 𝐫é𝐮𝐬𝐬𝐢!\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐂𝐚𝐬𝐡 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞: ${formatNumber(cash)}💲\n━━━━━━━━━━━━━━━━`,
        loanSuccess: (amount, debt, half) => `${getBorder()}✧ 𝐏𝐫ê𝐭 𝐚𝐜𝐜𝐨𝐫𝐝é!\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐃𝐞𝐭𝐭𝐞 𝐭𝐨𝐭𝐚𝐥𝐞: ${formatNumber(debt)}💲\n⚠️ 𝐑𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐳 ${formatNumber(half)}💲 𝐝𝐚𝐧𝐬 30𝐦𝐢𝐧!\n━━━━━━━━━━━━━━━━`,
        transferSuccess: (amount, target, name) => `${getBorder()}✧ 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫𝐭 𝐞𝐟𝐟𝐞𝐜𝐭𝐮é!\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐃𝐞𝐬𝐭𝐢𝐧𝐚𝐭𝐚𝐢𝐫𝐞: ${name}\n✧ 𝐔𝐈𝐃: ${target}\n━━━━━━━━━━━━━━━━`,
        vipActivated: () => `${getBorder()}🎉 𝐒𝐓𝐀𝐓𝐔𝐓 𝐕𝐈𝐏 𝐀𝐂𝐓𝐈𝐕𝐄!\n\n🌟 𝐀𝐯𝐚𝐧𝐭𝐚𝐠𝐞𝐬:\n• 𝐈𝐧𝐭é𝐫ê𝐭𝐬: 20% (𝐚𝐮 𝐥𝐢𝐞𝐮 𝐝𝐞 5%)\n• 𝐏𝐫ê𝐭 𝐦𝐚𝐱: 4,000,000💲\n• 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫𝐭 𝐦𝐚𝐱: 10𝐌💲/𝐣𝐨𝐮𝐫\n• 𝐏𝐚𝐬 𝐝𝐞 𝐩é𝐧𝐚𝐥𝐢𝐭é𝐬 𝐝𝐞 𝐝𝐞𝐭𝐭𝐞\n• 𝐀𝐜𝐜è𝐬 𝐞𝐱𝐜𝐥𝐮𝐬𝐢𝐟 𝐚𝐮 𝐜𝐚𝐬𝐢𝐧𝐨\n\n👑 𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐮𝐞 𝐝𝐚𝐧𝐬 𝐥'é𝐥𝐢𝐭𝐞!\n━━━━━━━━━━━━━━━━`,
        debtWarning: (debt, time) => `➔【𝐀𝐋𝐄𝐑𝐓𝐄 𝐃𝐄𝐓𝐓𝐄】\n✧════════════✧\n⚠️ 𝐃𝐞𝐭𝐭𝐞 𝐢𝐦𝐩𝐚𝐲é𝐞: ${formatNumber(debt)}💲\n⏰ 𝐓𝐞𝐦𝐩𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${time} 𝐦𝐢𝐧𝐮𝐭𝐞𝐬\n❌ 𝐒𝐚𝐧𝐜𝐭𝐢𝐨𝐧 à 𝐥'é𝐜𝐡é𝐚𝐧𝐜𝐞!\n✧════════════✧`,
        adminOnly: () => `➔【𝐀𝐂𝐂È𝐒 𝐑𝐄𝐅𝐔𝐒É】\n✧════════════✧\n✧ 𝐒𝐞𝐮𝐥𝐬 𝐥𝐞𝐬 𝐚𝐝𝐦𝐢𝐧𝐢𝐬𝐭𝐫𝐚𝐭𝐞𝐮𝐫𝐬 𝐩𝐞𝐮𝐯𝐞𝐧𝐭 𝐮𝐭𝐢𝐥𝐢𝐬𝐞𝐫 𝐜𝐞𝐭𝐭𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐞.\n✧════════════✧`,
        noPassword: () => `➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄 𝐍É𝐂𝐄𝐒𝐒𝐀𝐈𝐑𝐄】\n✧════════════✧\n🔒 𝐕𝐨𝐮𝐬 𝐧'𝐚𝐯𝐞𝐳 𝐩𝐚𝐬 𝐝𝐞 𝐦𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞!\n💡 𝐔𝐭𝐢𝐥𝐢𝐬𝐞𝐳: ~bank setpassword [𝐯𝐨𝐭𝐫𝐞𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞]\n✧════════════✧`,
        askAmount: (command) => `🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊\n━━━━━━━━━━━━━━━━\n✧ 𝐌𝐎𝐍𝐓𝐀𝐍𝐓 𝐃𝐔 ${command.toUpperCase()}\n💡 𝐕𝐞𝐮𝐢𝐥𝐥𝐞𝐳 𝐬𝐚𝐢𝐬𝐢𝐫 𝐥𝐞 𝐦𝐨𝐧𝐭𝐚𝐧𝐭:\n𝐄𝐱𝐞𝐦𝐩𝐥𝐞: 50000\n➤ _`,
        askPassword: () => `🔒 𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄\n💡 𝐕𝐞𝐮𝐢𝐥𝐥𝐞𝐳 𝐬𝐚𝐢𝐬𝐢𝐫 𝐯𝐨𝐭𝐫𝐞 𝐦𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞:\n➤ _`,
        debtInfo: (debt, nextPayment, timeLeft) => `${getBorder()}✧ 𝐕𝐎𝐓𝐑𝐄 𝐃𝐄𝐓𝐓𝐄:\n\n🎯 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐭𝐨𝐭𝐚𝐥: ${formatNumber(debt)}💲\n💳 𝐏𝐫𝐨𝐜𝐡𝐚𝐢𝐧 𝐩𝐚𝐢𝐞𝐦𝐞𝐧𝐭: ${formatNumber(nextPayment)}💲\n⏰ 𝐓𝐞𝐦𝐩𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${timeLeft}𝐦𝐢𝐧\n⚠️ 𝐑𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐳 𝐚𝐯𝐚𝐧𝐭 𝐥𝐚 𝐬𝐚𝐧𝐜𝐭𝐢𝐨𝐧!\n━━━━━━━━━━━━━━━━`,
        repaySuccess: (amount, remaining) => `${getBorder()}✧ 𝐑𝐄𝐌𝐁𝐎𝐔𝐑𝐒𝐄𝐌𝐄𝐍𝐓 𝐑É𝐔𝐒𝐒𝐈!\n\n💳 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐫𝐞𝐦𝐛𝐨𝐮𝐫𝐬é: ${formatNumber(amount)}💲\n🎯 𝐃𝐞𝐭𝐭𝐞 𝐫𝐞𝐬𝐭𝐚𝐧𝐭𝐞: ${formatNumber(remaining)}💲\n✅ 𝐕𝐨𝐭𝐫𝐞 𝐜𝐨𝐦𝐩𝐭𝐞 𝐞𝐬𝐭 𝐦𝐢𝐬 à 𝐣𝐨𝐮𝐫!\n━━━━━━━━━━━━━━━━`
    },
    en: {
        menu: `${getBorder()}✧ 𝐂𝐡𝐨𝐨𝐬𝐞 𝐚𝐧 𝐨𝐩𝐭𝐢𝐨𝐧:\n\n💰 𝐅𝐢𝐧𝐚𝐧𝐜𝐞:\n➤ ~bank balance [password]\n➤ ~bank deposit [amount] [password]\n➤ ~bank withdraw [amount] [password]\n➤ ~bank transfer [uid] [amount] [password]\n\n🏦 𝐋𝐨𝐚𝐧𝐬:\n➤ ~bank loan [amount] [password]\n➤ ~bank debt [password]\n➤ ~bank repay [amount] [password]\n\n🎯 𝐈𝐧𝐯𝐞𝐬𝐭𝐦𝐞𝐧𝐭𝐬:\n➤ ~bank invest [amount]\n➤ ~bank hrinvest [amount]\n➤ ~bank crypto [amount]\n\n🎰 𝐆𝐚𝐦𝐞 & 𝐑𝐢𝐬𝐤:\n➤ ~bank gamble [amount] [password]\n➤ ~bank casino [amount]\n➤ ~bank heist [target]\n➤ ~bank lottery buy\n\n🛡️ 𝐒𝐞𝐜𝐮𝐫𝐢𝐭𝐲:\n➤ ~bank setpassword [password]\n➤ ~bank changepassword [new] [old]\n➤ ~bank removepassword [password]\n➤ ~bank vault deposit [amount]\n➤ ~bank vault withdraw [amount]\n➤ ~bank insure buy\n\n👑 𝐕𝐈𝐏 & 𝐒𝐭𝐚𝐭𝐮𝐬:\n➤ ~bank vip\n➤ ~bank vip list\n➤ ~bank leaderboard\n➤ ~bank achievements\n\n⚙️ 𝐂𝐨𝐧𝐟𝐢𝐠𝐮𝐫𝐚𝐭𝐢𝐨𝐧:\n➤ ~bank mode text/image/video\n➤ ~bank language fr/en\n➤ ~bank stats [global]\n\n🔧 𝐀𝐝𝐦𝐢𝐧 (𝐞𝐥𝐢𝐭𝐞):\n➤ ~bank admin set [uid] [value]\n➤ ~bank admin vip [uid]\n➤ ~bank admin prison [uid] [minutes]\n━━━━━━━━━━━━━━━━`,
        solde: (bank, cash, debt, vip) => `${getBorder()}✧ 𝐘𝐨𝐮𝐫 𝐛𝐚𝐥𝐚𝐧𝐜𝐞:\n\n💰 𝐂𝐚𝐬𝐡: ${formatNumber(cash)}💲\n🏦 𝐁𝐚𝐧𝐤: ${formatNumber(bank)}💲\n📈 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭: ${vip ? '20% 🌟' : '5%'}\n🎯 𝐃𝐞𝐛𝐭: ${formatNumber(debt)}💲${vip ? '\n👑 𝐒𝐭𝐚𝐭𝐮𝐬: 𝐕𝐈𝐏 🌟' : ''}\n━━━━━━━━━━━━━━━━`,
        depositSuccess: (amount, balance) => `${getBorder()}✧ 𝐃𝐞𝐩𝐨𝐬𝐢𝐭 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥!\n✧ 𝐀𝐦𝐨𝐮𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐍𝐞𝐰 𝐛𝐚𝐥𝐚𝐧𝐜𝐞: ${formatNumber(balance)}💲\n━━━━━━━━━━━━━━━━`,
        withdrawSuccess: (amount, cash) => `${getBorder()}✧ 𝐖𝐢𝐭𝐡𝐝𝐫𝐚𝐰𝐚𝐥 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥!\n✧ 𝐀𝐦𝐨𝐮𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐜𝐚𝐬𝐡: ${formatNumber(cash)}💲\n━━━━━━━━━━━━━━━━`,
        loanSuccess: (amount, debt, half) => `${getBorder()}✧ 𝐋𝐨𝐚𝐧 𝐚𝐩𝐩𝐫𝐨𝐯𝐞𝐝!\n✧ 𝐀𝐦𝐨𝐮𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐓𝐨𝐭𝐚𝐥 𝐝𝐞𝐛𝐭: ${formatNumber(debt)}💲\n⚠️ 𝐑𝐞𝐩𝐚𝐲 ${formatNumber(half)}💲 𝐢𝐧 30𝐦𝐢𝐧!\n━━━━━━━━━━━━━━━━`,
        transferSuccess: (amount, target, name) => `${getBorder()}✧ 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫 𝐜𝐨𝐦𝐩𝐥𝐞𝐭𝐞𝐝!\n✧ 𝐀𝐦𝐨𝐮𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐑𝐞𝐜𝐢𝐩𝐢𝐞𝐧𝐭: ${name}\n✧ 𝐔𝐈𝐃: ${target}\n━━━━━━━━━━━━━━━━`,
        vipActivated: () => `${getBorder()}🎉 𝐕𝐈𝐏 𝐒𝐓𝐀𝐓𝐔𝐒 𝐀𝐂𝐓𝐈𝐕𝐀𝐓𝐄𝐃!\n\n🌟 𝐀𝐝𝐯𝐚𝐧𝐭𝐚𝐠𝐞𝐬:\n• 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭: 20% (𝐢𝐧𝐬𝐭𝐞𝐚𝐝 𝐨𝐟 5%)\n• 𝐌𝐚𝐱 𝐥𝐨𝐚𝐧: 4,000,000💲\n• 𝐌𝐚𝐱 𝐭𝐫𝐚𝐧𝐬𝐟𝐞𝐫: 10𝐌💲/𝐝𝐚𝐲\n• 𝐍𝐨 𝐝𝐞𝐛𝐭 𝐩𝐞𝐧𝐚𝐥𝐭𝐢𝐞𝐬\n• 𝐄𝐱𝐜𝐥𝐮𝐬𝐢𝐯𝐞 𝐜𝐚𝐬𝐢𝐧𝐨 𝐚𝐜𝐜𝐞𝐬𝐬\n\n👑 𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐭𝐨 𝐭𝐡𝐞 𝐞𝐥𝐢𝐭𝐞!\n━━━━━━━━━━━━━━━━`,
        debtWarning: (debt, time) => `➔【𝐃𝐄𝐁𝐓 𝐀𝐋𝐄𝐑𝐓】\n✧════════════✧\n⚠️ 𝐔𝐧𝐩𝐚𝐢𝐝 𝐝𝐞𝐛𝐭: ${formatNumber(debt)}💲\n⏰ 𝐓𝐢𝐦𝐞 𝐫𝐞𝐦𝐚𝐢𝐧𝐢𝐧𝐠: ${time} 𝐦𝐢𝐧𝐮𝐭𝐞𝐬\n❌ 𝐒𝐚𝐧𝐜𝐭𝐢𝐨𝐧 𝐚𝐭 𝐦𝐚𝐭𝐮𝐫𝐢𝐭𝐲!\n✧════════════✧`,
        adminOnly: () => `➔【𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃】\n✧════════════✧\n✧ 𝐎𝐧𝐥𝐲 𝐚𝐝𝐦𝐢𝐧𝐢𝐬𝐭𝐫𝐚𝐭𝐨𝐫𝐬 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐭𝐡𝐢𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝.\n✧════════════✧`,
        noPassword: () => `➔【𝐏𝐀𝐒𝐒𝐖𝐎𝐑𝐃 𝐑𝐄𝐐𝐔𝐈𝐑𝐄𝐃】\n✧════════════✧\n🔒 𝐘𝐨𝐮 𝐝𝐨𝐧'𝐭 𝐡𝐚𝐯𝐞 𝐚 𝐩𝐚𝐬𝐬𝐰𝐨𝐫𝐝!\n💡 𝐔𝐬𝐞: ~bank setpassword [𝐲𝐨𝐮𝐫𝐩𝐚𝐬𝐬𝐰𝐨𝐫𝐝]\n✧════════════✧`,
        askAmount: (command) => `🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊\n━━━━━━━━━━━━━━━━\n✧ 𝐀𝐌𝐎𝐔𝐍𝐓 𝐅𝐎𝐑 ${command.toUpperCase()}\n💡 𝐏𝐥𝐞𝐚𝐬𝐞 𝐞𝐧𝐭𝐞𝐫 𝐭𝐡𝐞 𝐚𝐦𝐨𝐮𝐧𝐭:\n𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 50000\n➤ _`,
        askPassword: () => `🔒 𝐏𝐀𝐒𝐒𝐖𝐎𝐑𝐃\n💡 𝐏𝐥𝐞𝐚𝐬𝐞 𝐞𝐧𝐭𝐞𝐫 𝐲𝐨𝐮𝐫 𝐩𝐚𝐬𝐬𝐰𝐨𝐫𝐝:\n➤ _`,
        debtInfo: (debt, nextPayment, timeLeft) => `${getBorder()}✧ 𝐘𝐎𝐔𝐑 𝐃𝐄𝐁𝐓:\n\n🎯 𝐓𝐨𝐭𝐚𝐥 𝐚𝐦𝐨𝐮𝐧𝐭: ${formatNumber(debt)}💲\n💳 𝐍𝐞𝐱𝐭 𝐩𝐚𝐲𝐦𝐞𝐧𝐭: ${formatNumber(nextPayment)}💲\n⏰ 𝐓𝐢𝐦𝐞 𝐥𝐞𝐟𝐭: ${timeLeft}𝐦𝐢𝐧\n⚠️ 𝐑𝐞𝐩𝐚𝐲 𝐛𝐞𝐟𝐨𝐫𝐞 𝐬𝐚𝐧𝐜𝐭𝐢𝐨𝐧!\n━━━━━━━━━━━━━━━━`,
        repaySuccess: (amount, remaining) => `${getBorder()}✧ 𝐑𝐄𝐏𝐀𝐘𝐌𝐄𝐍𝐓 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋!\n\n💳 𝐀𝐦𝐨𝐮𝐧𝐭 𝐫𝐞𝐩𝐚𝐢𝐝: ${formatNumber(amount)}💲\n🎯 𝐑𝐞𝐦𝐚𝐢𝐧𝐢𝐧𝐠 𝐝𝐞𝐛𝐭: ${formatNumber(remaining)}💲\n✅ 𝐘𝐨𝐮𝐫 𝐚𝐜𝐜𝐨𝐮𝐧𝐭 𝐢𝐬 𝐮𝐩𝐝𝐚𝐭𝐞𝐝!\n━━━━━━━━━━━━━━━━`
    }
};

module.exports = {
    config: {
        name: "bank",
        version: "9.0",
        author: "𝐔𝐜𝐡𝐢𝐡𝐚 𝐏𝐞𝐫𝐝𝐮 & ʚʆɞ 𝐒ø𝐦å 𝐒ø𝐧ïč ʚʆɞ",
        role: 0,
        category: "💰 É𝐜𝐨𝐧𝐨𝐦𝐢𝐞",
        shortDescription: "𝐒𝐲𝐬𝐭è𝐦𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞 𝐮𝐥𝐭𝐢𝐦𝐞 𝐚𝐯𝐞𝐜 𝐯𝐢𝐝é𝐨",
        longDescription: "𝐆𝐞𝐬𝐭𝐢𝐨𝐧 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞 𝐜𝐨𝐦𝐩𝐥è𝐭𝐞 𝐚𝐯𝐞𝐜 𝐬é𝐜𝐮𝐫𝐢𝐭é, 𝐢𝐧𝐯𝐞𝐬𝐭𝐢𝐬𝐬𝐞𝐦𝐞𝐧𝐭𝐬, 𝐩𝐫ê𝐭𝐬, 𝐞𝐭 𝐦𝐨𝐝𝐞𝐬 𝐭𝐞𝐱𝐭𝐞/𝐢𝐦𝐚𝐠𝐞/𝐯𝐢𝐝é𝐨",
        guide: "{pn} [𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐞] [𝐨𝐩𝐭𝐢𝐨𝐧𝐬]"
    },

    onStart: async function({ message, event, args, api, usersData }) {
        const userId = event.senderID;
        const threadId = event.threadID;
        
        let balance = loadBalance();
        let users = loadUsers();
        let security = loadSecurity();

        if (!balance[userId]) {
            balance[userId] = { 
                bank: 0, 
                cash: 1000, 
                debt: 0, 
                vault: 0, 
                password: null, 
                insurance: false, 
                karma: 0, 
                failedHeists: 0, 
                prisonUntil: 0, 
                dailyStreak: 0, 
                lastDaily: 0, 
                lastInterest: 0 
            };
        }

        if (!users[userId]) {
            const userName = await getUserName(userId, api);
            users[userId] = { 
                name: userName, 
                language: 'fr', 
                vip: false, 
                displayMode: DISPLAY_MODES.TEXT, 
                achievements: [] 
            };
        }

        const userData = balance[userId];
        const userLang = users[userId].language || 'fr';
        const isVIP = users[userId].vip || false;
        const displayMode = users[userId].displayMode || DISPLAY_MODES.TEXT;
        const userName = users[userId].name;

        if (userData.prisonUntil > Date.now()) {
            const prisonTime = Math.ceil((userData.prisonUntil - Date.now()) / (60 * 1000));
            await sendResponse(
                `➔【𝐏𝐑𝐈𝐒𝐎𝐍】\n✧════════════✧\n✧ 𝐕𝐨𝐮𝐬 ê𝐭𝐞𝐬 𝐞𝐧 𝐩𝐫𝐢𝐬𝐨𝐧! ⛓️\n⏰ 𝐓𝐞𝐦𝐩𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${prisonTime} 𝐦𝐢𝐧𝐮𝐭𝐞𝐬\n🚫 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬 𝐛𝐥𝐨𝐪𝐮é𝐞𝐬: 𝐠𝐚𝐦𝐛𝐥𝐞, 𝐡𝐞𝐢𝐬𝐭, 𝐢𝐧𝐯𝐞𝐬𝐭, 𝐩𝐫ê𝐭\n━━━━━━━━━━━━━━━━`,
                'error',
                { 𝐒𝐭𝐚𝐭𝐮𝐭: '𝐏𝐫𝐢𝐬𝐨𝐧', '𝐓𝐞𝐦𝐩𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭': `${prisonTime}𝐦𝐢𝐧`, 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐨𝐦𝐩𝐭𝐞 𝐛𝐥𝐨𝐪𝐮é 𝐭𝐞𝐦𝐩𝐨𝐫𝐚𝐢𝐫𝐞𝐦𝐞𝐧𝐭' },
                displayMode,
                api,
                event,
                userName
            );
            return;
        }

        if (security.attempts?.[userId] && Date.now() - security.attempts[userId].timestamp > 5 * 60 * 1000) {
            delete security.attempts[userId];
        }

        const noPasswordCommands = ['setpassword', 'mode', 'language', 'vip', 'vip list', 'leaderboard', 'top', 'help', 'menu', 'admin'];
        const command = args[0]?.toLowerCase();
        const subCommand = args[1]?.toLowerCase();

        if (!command) {
            await sendResponse(
                LANG[userLang].menu,
                'menu',
                { '𝐌𝐨𝐝𝐞 𝐚𝐜𝐭𝐮𝐞𝐥': displayMode.toUpperCase(), 𝐋𝐚𝐧𝐠𝐮𝐞: userLang.toUpperCase(), 𝐒𝐭𝐚𝐭𝐮𝐭: isVIP ? '𝐕𝐈𝐏 🌟' : '𝐒𝐭𝐚𝐧𝐝𝐚𝐫𝐝' },
                displayMode,
                api,
                event,
                userName
            );
            return;
        }

        const ADMIN_UID = ["61578433048588", "100083846212138"];
        
        if (command === 'admin') {
            if (!ADMIN_UID.includes(userId.toString())) {
                await sendResponse(LANG[userLang].adminOnly(), 'error', { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐀𝐜𝐜è𝐬 𝐚𝐝𝐦𝐢𝐧 𝐫𝐞𝐟𝐮𝐬é' }, displayMode, api, event, userName);
                return;
            }
            
            if (subCommand === 'set' && args[2] && args[3]) {
                const target = args[2];
                const amount = parseInt(args[3]);
                if (!balance[target]) balance[target] = { bank: 0, cash: 0, debt: 0 };
                balance[target].bank = amount;
                saveBalance(balance);
                await sendResponse(`${getBorder()}✅ 𝐀𝐝𝐦𝐢𝐧: 𝐒𝐨𝐥𝐝𝐞 𝐝𝐞 ${target} 𝐝é𝐟𝐢𝐧𝐢 à ${formatNumber(amount)}💲\n━━━━━━━━━━━━━━━━`, 'success', { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: `𝐒𝐨𝐥𝐝𝐞 𝐝é𝐟𝐢𝐧𝐢 𝐩𝐨𝐮𝐫 ${target}: ${formatNumber(amount)}💲` }, displayMode, api, event, userName);
                return;
            }
            
            if (subCommand === 'vip' && args[2]) {
                const target = args[2];
                if (!users[target]) users[target] = { language: 'fr', vip: false };
                users[target].vip = true;
                saveUsers(users);
                await sendResponse(`${getBorder()}✅ 𝐀𝐝𝐦𝐢𝐧: 𝐕𝐈𝐏 𝐚𝐜𝐜𝐨𝐫𝐝é à ${target}\n━━━━━━━━━━━━━━━━`, 'success', { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: `𝐕𝐈𝐏 𝐚𝐜𝐜𝐨𝐫𝐝é à ${target}` }, displayMode, api, event, userName);
                return;
            }
            
            if (subCommand === 'prison' && args[2] && args[3]) {
                const target = args[2];
                const minutes = parseInt(args[3]);
                if (!balance[target]) balance[target] = { prisonUntil: 0 };
                balance[target].prisonUntil = Date.now() + minutes * 60 * 1000;
                saveBalance(balance);
                await sendResponse(`${getBorder()}✅ 𝐀𝐝𝐦𝐢𝐧: ${target} 𝐞𝐧 𝐩𝐫𝐢𝐬𝐨𝐧 𝐩𝐨𝐮𝐫 ${minutes} 𝐦𝐢𝐧𝐮𝐭𝐞𝐬\n━━━━━━━━━━━━━━━━`, 'success', { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: `${target} 𝐞𝐧 𝐩𝐫𝐢𝐬𝐨𝐧 𝐩𝐨𝐮𝐫 ${minutes} 𝐦𝐢𝐧𝐮𝐭𝐞𝐬` }, displayMode, api, event, userName);
                return;
            }
        }

        const requiresPassword = !noPasswordCommands.includes(command) && !noPasswordCommands.includes(`${command} ${subCommand}`);
        
        if (requiresPassword) {
            if (!balance[userId].password) {
                await sendResponse(LANG[userLang].noPassword(), 'error', { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐧𝐨𝐧 𝐝é𝐟𝐢𝐧𝐢' }, displayMode, api, event, userName);
                return;
            }

            const password = args[args.length - 1];
            const expectedPassword = balance[userId].password.toString();
            
            if (!password || password !== expectedPassword) {
                if (!security.attempts) security.attempts = {};
                if (!security.attempts[userId]) {
                    security.attempts[userId] = { count: 0, timestamp: Date.now() };
                }
                
                security.attempts[userId].count++;
                
                if (security.attempts[userId].count >= 3) {
                    balance[userId].prisonUntil = Date.now() + 5 * 60 * 1000;
                    saveBalance(balance);
                    security.attempts[userId] = { count: 0, timestamp: Date.now() };
                    
                    await sendResponse(
                        `➔【𝐁𝐋𝐎𝐐𝐔É】\n✧════════════✧\n❌ 𝐓𝐫𝐨𝐩 𝐝𝐞 𝐭𝐞𝐧𝐭𝐚𝐭𝐢𝐯𝐞𝐬!\n🔒 𝐂𝐨𝐦𝐩𝐭𝐞 𝐛𝐥𝐨𝐪𝐮é 5 𝐦𝐢𝐧𝐮𝐭𝐞𝐬\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐨𝐦𝐩𝐭𝐞 𝐛𝐥𝐨𝐪𝐮é - 𝐭𝐫𝐨𝐩 𝐝𝐞 𝐭𝐞𝐧𝐭𝐚𝐭𝐢𝐯𝐞𝐬' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                saveSecurity(security);
                
                await sendResponse(
                    `➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ 𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐢𝐧𝐜𝐨𝐫𝐫𝐞𝐜𝐭!\n⚠️ 𝐓𝐞𝐧𝐭𝐚𝐭𝐢𝐯𝐞 ${security.attempts[userId].count}/3\n✧════════════✧`,
                    'error',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐢𝐧𝐜𝐨𝐫𝐫𝐞𝐜𝐭' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                return;
            }
            
            if (security.attempts?.[userId]) {
                delete security.attempts[userId];
                saveSecurity(security);
            }
            
            args.pop();
        }

        const amountCommands = ['depot', 'deposit', 'retirer', 'withdraw', 'prêt', 'loan', 'transfer', 'transférer', 'gamble', 'investir'];
        
        if (amountCommands.includes(command) && (!args[1] || isNaN(parseInt(args[1])))) {
            await sendResponse(LANG[userLang].askAmount(command), 'info', { 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞: command, 𝐄𝐱𝐞𝐦𝐩𝐥𝐞: '50000' }, displayMode, api, event, userName);
            return;
        }

        switch (command) {
            case 'solde':
            case 'balance': {
                await sendResponse(
                    LANG[userLang].solde(balance[userId].bank, balance[userId].cash, balance[userId].debt, isVIP),
                    'solde',
                    { 𝐜𝐚𝐬𝐡: balance[userId].cash, 𝐛𝐚𝐧𝐤: balance[userId].bank, 𝐝𝐞𝐛𝐭: balance[userId].debt, 𝐯𝐢𝐩: isVIP, 𝐢𝐧𝐬𝐮𝐫𝐚𝐧𝐜𝐞: balance[userId].insurance },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'déposer':
            case 'deposit': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞!\n💡 𝐄𝐱𝐞𝐦𝐩𝐥𝐞: ~bank déposer 1000 𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (balance[userId].cash < amount) {
                    await sendResponse(
                        `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭!\n💰 𝐕𝐨𝐮𝐬 𝐚𝐯𝐞𝐳: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                balance[userId].cash -= amount;
                balance[userId].bank += amount;
                saveBalance(balance);

                if (!security.transactions) security.transactions = [];
                security.transactions.push({ userId, type: 'DEPOSIT', amount, timestamp: Date.now() });
                saveSecurity(security);

                await sendResponse(
                    LANG[userLang].depositSuccess(amount, balance[userId].bank),
                    'depot',
                    { 𝐚𝐦𝐨𝐮𝐧𝐭: amount, 𝐧𝐞𝐰𝐁𝐚𝐥𝐚𝐧𝐜𝐞: balance[userId].bank },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'retirer':
            case 'withdraw': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞!\n💡 𝐄𝐱𝐞𝐦𝐩𝐥𝐞: ~bank retirer 1000 𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (balance[userId].bank < amount) {
                    await sendResponse(
                        `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐒𝐨𝐥𝐝𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭!\n🏦 𝐕𝐨𝐮𝐬 𝐚𝐯𝐞𝐳: ${formatNumber(balance[userId].bank)}💲\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐒𝐨𝐥𝐝𝐞 𝐛𝐚𝐧𝐜𝐚𝐢𝐫𝐞 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                balance[userId].bank -= amount;
                balance[userId].cash += amount;
                saveBalance(balance);

                await sendResponse(
                    LANG[userLang].withdrawSuccess(amount, balance[userId].cash),
                    'retrait',
                    { 𝐚𝐦𝐨𝐮𝐧𝐭: amount, 𝐜𝐚𝐬𝐡: balance[userId].cash },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'prêt':
            case 'loan': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞!\n💡 𝐄𝐱𝐞𝐦𝐩𝐥𝐞: ~bank prêt 50000 𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                const maxLoan = isVIP ? 4000000 : 1000000;
                const remainingLoan = maxLoan - balance[userId].debt;

                if (remainingLoan <= 0) {
                    await sendResponse(
                        `➔【𝐋𝐈𝐌𝐈𝐓𝐄】\n✧════════════✧\n✧ 𝐋𝐢𝐦𝐢𝐭𝐞 𝐝𝐞 𝐩𝐫ê𝐭 𝐚𝐭𝐭𝐞𝐢𝐧𝐭𝐞!\n🎯 𝐃𝐞𝐭𝐭𝐞 𝐚𝐜𝐭𝐮𝐞𝐥𝐥𝐞: ${formatNumber(balance[userId].debt)}💲\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐋𝐢𝐦𝐢𝐭𝐞 𝐝𝐞 𝐩𝐫ê𝐭 𝐚𝐭𝐭𝐞𝐢𝐧𝐭𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (amount > remainingLoan) {
                    await sendResponse(
                        `➔【𝐃É𝐏𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓】\n✧════════════✧\n✧ 𝐕𝐨𝐮𝐬 𝐧𝐞 𝐩𝐨𝐮𝐯𝐞𝐳 𝐞𝐦𝐩𝐫𝐮𝐧𝐭𝐞𝐫 𝐪𝐮𝐞 ${formatNumber(remainingLoan)}💲 𝐝𝐞 𝐩𝐥𝐮𝐬!\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐝é𝐩𝐚𝐬𝐬𝐚𝐧𝐭 𝐥𝐚 𝐥𝐢𝐦𝐢𝐭𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                balance[userId].cash += amount;
                balance[userId].debt += amount;
                saveBalance(balance);

                loans[userId] = { amount, threadID: threadId, timestamp: Date.now(), stage: 1 };
                setTimeout(() => checkLoanRepayment(userId, api, userLang), 30 * 60 * 1000);

                await sendResponse(
                    LANG[userLang].loanSuccess(amount, balance[userId].debt, amount / 2),
                    'pret',
                    { 𝐚𝐦𝐨𝐮𝐧𝐭: amount, 𝐝𝐞𝐛𝐭: balance[userId].debt, 𝐡𝐚𝐥𝐟: amount / 2, 𝐩𝐚𝐬𝐬𝐰𝐨𝐫𝐝: args[args.length - 1] || '' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'dette':
            case 'debt': {
                const loan = loans[userId];
                if (!loan || balance[userId].debt <= 0) {
                    await sendResponse(
                        `${getBorder()}✅ 𝐀𝐔𝐂𝐔𝐍𝐄 𝐃𝐄𝐓𝐓𝐄!\n\n💰 𝐕𝐨𝐮𝐬 𝐧'𝐚𝐯𝐞𝐳 𝐚𝐮𝐜𝐮𝐧𝐞 𝐝𝐞𝐭𝐭𝐞 𝐞𝐧 𝐜𝐨𝐮𝐫𝐬.\n🏦 𝐏𝐫𝐨𝐟𝐢𝐭𝐞𝐳-𝐞𝐧 𝐩𝐨𝐮𝐫 𝐟𝐚𝐢𝐫𝐞 𝐝𝐞𝐬 𝐩𝐫ê𝐭𝐬!\n━━━━━━━━━━━━━━━━`,
                        'dette',
                        { 𝐝𝐞𝐛𝐭: 0, 𝐬𝐭𝐚𝐭𝐮𝐬: '𝐀𝐮𝐜𝐮𝐧𝐞 𝐝𝐞𝐭𝐭𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                const now = Date.now();
                const timePassed = now - loan.timestamp;
                const timeLeft = Math.max(0, 30 - Math.floor(timePassed / (60 * 1000)));
                const nextPayment = Math.min(balance[userId].debt, loan.amount / 2);
                const status = timeLeft > 0 ? '𝐄𝐧 𝐜𝐨𝐮𝐫𝐬' : '𝐄𝐧 𝐫𝐞𝐭𝐚𝐫𝐝';

                await sendResponse(
                    LANG[userLang].debtInfo(balance[userId].debt, nextPayment, timeLeft),
                    'dette',
                    { 𝐚𝐦𝐨𝐮𝐧𝐭: balance[userId].debt, 𝐭𝐢𝐦𝐞: timeLeft, 𝐬𝐭𝐚𝐭𝐮𝐬: status, 𝐧𝐞𝐱𝐭𝐏𝐚𝐲𝐦𝐞𝐧𝐭: nextPayment },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'rembourser':
            case 'repay': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞!\n💡 𝐄𝐱𝐞𝐦𝐩𝐥𝐞: ~bank rembourser 50000 𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (balance[userId].debt <= 0) {
                    await sendResponse(
                        `➔【𝐈𝐍𝐅𝐎】\n✧════════════✧\n✧ 𝐕𝐨𝐮𝐬 𝐧'𝐚𝐯𝐞𝐳 𝐚𝐮𝐜𝐮𝐧𝐞 𝐝𝐞𝐭𝐭𝐞 à 𝐫𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐫!\n✧════════════✧`,
                        'info',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐀𝐮𝐜𝐮𝐧𝐞 𝐝𝐞𝐭𝐭𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (amount > balance[userId].debt) {
                    await sendResponse(
                        `➔【𝐃É𝐏𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓】\n✧════════════✧\n✧ 𝐕𝐨𝐮𝐬 𝐧𝐞 𝐩𝐨𝐮𝐯𝐞𝐳 𝐫𝐞𝐦𝐛𝐨𝐮𝐫𝐬𝐞𝐫 𝐩𝐥𝐮𝐬 𝐪𝐮𝐞 𝐯𝐨𝐭𝐫𝐞 𝐝𝐞𝐭𝐭𝐞!\n🎯 𝐃𝐞𝐭𝐭𝐞 𝐚𝐜𝐭𝐮𝐞𝐥𝐥𝐞: ${formatNumber(balance[userId].debt)}💲\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐝é𝐩𝐚𝐬𝐬𝐚𝐧𝐭 𝐥𝐚 𝐝𝐞𝐭𝐭𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                const totalAvailable = balance[userId].cash + balance[userId].bank;
                if (amount > totalAvailable) {
                    await sendResponse(
                        `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐅𝐨𝐧𝐝𝐬 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬!\n💰 𝐃𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞: ${formatNumber(totalAvailable)}💲\n💳 𝐍é𝐜𝐞𝐬𝐬𝐚𝐢𝐫𝐞: ${formatNumber(amount)}💲\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐅𝐨𝐧𝐝𝐬 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                let paidFromCash = Math.min(balance[userId].cash, amount);
                let paidFromBank = amount - paidFromCash;

                balance[userId].cash -= paidFromCash;
                balance[userId].bank -= paidFromBank;
                balance[userId].debt -= amount;

                if (balance[userId].debt <= 0) {
                    delete loans[userId];
                }

                saveBalance(balance);

                await sendResponse(
                    LANG[userLang].repaySuccess(amount, balance[userId].debt),
                    'rembourser',
                    { 𝐚𝐦𝐨𝐮𝐧𝐭: amount, 𝐫𝐞𝐦𝐚𝐢𝐧𝐢𝐧𝐠: balance[userId].debt, 𝐩𝐚𝐢𝐝𝐅𝐫𝐨𝐦𝐂𝐚𝐬𝐡: paidFromCash, 𝐩𝐚𝐢𝐝𝐅𝐫𝐨𝐦𝐁𝐚𝐧𝐤: paidFromBank },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'transfer':
            case 'transférer': {
                const target = args[1];
                const amount = parseInt(args[2]);
                
                if (!target || !amount || amount <= 0) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐒𝐲𝐧𝐭𝐚𝐱𝐞: ~bank transfer [𝐔𝐈𝐃] [𝐦𝐨𝐧𝐭𝐚𝐧𝐭] [𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞]\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐒𝐲𝐧𝐭𝐚𝐱𝐞 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (balance[userId].cash < amount) {
                    await sendResponse(
                        `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭!\n💰 𝐕𝐨𝐮𝐬 𝐚𝐯𝐞𝐳: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (!balance[target]) {
                    balance[target] = { bank: 0, cash: 0, debt: 0, vault: 0, password: null };
                }

                if (!users[target]) {
                    users[target] = { name: await getUserName(target, api), language: 'fr', vip: false };
                }

                balance[userId].cash -= amount;
                balance[target].cash += amount;
                saveBalance(balance);
                saveUsers(users);

                const targetName = users[target].name;
                
                try {
                    await api.sendMessage(
                        `${getBorder()}🎉 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐓 𝐑𝐄Ç𝐔!\n\n✧ 𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(amount)}💲\n✧ 𝐄𝐱𝐩é𝐝𝐢𝐭𝐞𝐮𝐫: ${userName}\n✧ 𝐕𝐨𝐭𝐫𝐞 𝐧𝐨𝐮𝐯𝐞𝐚𝐮 𝐜𝐚𝐬𝐡: ${formatNumber(balance[target].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        target
                    );
                } catch {}

                await sendResponse(
                    LANG[userLang].transferSuccess(amount, target, targetName),
                    'transfert',
                    { 𝐚𝐦𝐨𝐮𝐧𝐭: amount, 𝐭𝐚𝐫𝐠𝐞𝐭: targetName, 𝐮𝐢𝐝: target },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'vip': {
                if (subCommand === 'list') {
                    const vipUsers = Object.entries(users)
                        .filter(([_, data]) => data.vip)
                        .map(([uid, data]) => `${data.name} (${uid})`)
                        .join('\n');
                    
                    await sendResponse(
                        `${getBorder()}👑 𝐋𝐈𝐒𝐓𝐄 𝐕𝐈𝐏:\n\n${vipUsers || '𝐀𝐮𝐜𝐮𝐧 𝐕𝐈𝐏 𝐩𝐨𝐮𝐫 𝐥𝐞 𝐦𝐨𝐦𝐞𝐧𝐭'}\n━━━━━━━━━━━━━━━━`,
                        'vip',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: vipUsers || '𝐀𝐮𝐜𝐮𝐧 𝐕𝐈𝐏' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                if (isVIP) {
                    await sendResponse(
                        `${getBorder()}✅ 𝐕𝐨𝐮𝐬 ê𝐭𝐞𝐬 𝐝é𝐣à 𝐕𝐈𝐏! 🌟\n━━━━━━━━━━━━━━━━`,
                        'vip',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐃é𝐣à 𝐕𝐈𝐏' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }

                const requiredBalance = 3000000000;
                if (balance[userId].bank >= requiredBalance) {
                    users[userId].vip = true;
                    saveUsers(users);
                    
                    if (!users[userId].achievements.includes('VIP')) {
                        users[userId].achievements.push('VIP');
                        saveUsers(users);
                    }
                    
                    await sendResponse(
                        LANG[userLang].vipActivated(),
                        'vip',
                        { 𝐫𝐞𝐪𝐮𝐢𝐫𝐞𝐝: requiredBalance, 𝐜𝐮𝐫𝐫𝐞𝐧𝐭: balance[userId].bank },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    const missing = requiredBalance - balance[userId].bank;
                    await sendResponse(
                        `${getBorder()}❌ 𝐒𝐎𝐋𝐃𝐄 𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓!\n\n💰 𝐑𝐞𝐪𝐮𝐢𝐬: ${formatNumber(requiredBalance)}💲\n🏦 𝐕𝐨𝐮𝐬 𝐚𝐯𝐞𝐳: ${formatNumber(balance[userId].bank)}💲\n🎯 𝐌𝐚𝐧𝐪𝐮𝐚𝐧𝐭: ${formatNumber(missing)}💲\n━━━━━━━━━━━━━━━━`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐒𝐨𝐥𝐝𝐞 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭 𝐩𝐨𝐮𝐫 𝐕𝐈𝐏' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }

            case 'mode': {
                const mode = args[1]?.toLowerCase();
                if (!mode || !Object.values(DISPLAY_MODES).includes(mode)) {
                    await sendResponse(
                        `${getBorder()}🎨 𝐌𝐎𝐃𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:\n\n➤ ~bank mode text\n➤ ~bank mode image\n➤ ~bank mode video\n\n📱 𝐌𝐨𝐝𝐞 𝐚𝐜𝐭𝐮𝐞𝐥: ${displayMode.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐝𝐞𝐬 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞𝐬' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                users[userId].displayMode = mode;
                saveUsers(users);
                
                await sendResponse(
                    `${getBorder()}✅ 𝐌𝐨𝐝𝐞 𝐝'𝐚𝐟𝐟𝐢𝐜𝐡𝐚𝐠𝐞 𝐜𝐡𝐚𝐧𝐠é: ${mode.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                    'success',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: `𝐌𝐨𝐝𝐞 𝐜𝐡𝐚𝐧𝐠é 𝐞𝐧 ${mode}` },
                    mode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'language':
            case 'langue': {
                const lang = args[1]?.toLowerCase();
                if (lang !== 'fr' && lang !== 'en') {
                    await sendResponse(
                        `${getBorder()}🌍 𝐋𝐀𝐍𝐆𝐔𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:\n\n➤ ~bank language fr\n➤ ~bank language en\n\n🗣️ 𝐋𝐚𝐧𝐠𝐮𝐞 𝐚𝐜𝐭𝐮𝐞𝐥𝐥𝐞: ${userLang.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐋𝐚𝐧𝐠𝐮𝐞𝐬 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐥𝐞𝐬' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (lang === userLang) {
                    await sendResponse(
                        `${getBorder()}ℹ️ 𝐋𝐚𝐧𝐠𝐮𝐞 𝐝é𝐣à 𝐝é𝐟𝐢𝐧𝐢𝐞 𝐬𝐮𝐫 ${lang.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐋𝐚𝐧𝐠𝐮𝐞 𝐝é𝐣à 𝐝é𝐟𝐢𝐧𝐢𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                users[userId].language = lang;
                saveUsers(users);
                
                await sendResponse(
                    `${getBorder()}✅ 𝐋𝐚𝐧𝐠𝐮𝐞 𝐜𝐡𝐚𝐧𝐠é𝐞: ${lang.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                    'success',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: `𝐋𝐚𝐧𝐠𝐮𝐞 𝐜𝐡𝐚𝐧𝐠é𝐞 𝐞𝐧 ${lang}` },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'setpassword': {
                const newPassword = args[1];
                if (!newPassword) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐒𝐲𝐧𝐭𝐚𝐱𝐞: ~bank setpassword [𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞]\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐦𝐚𝐧𝐪𝐮𝐚𝐧𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].password = newPassword;
                saveBalance(balance);
                
                await sendResponse(
                    `➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ ✅ 𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐝é𝐟𝐢𝐧𝐢 𝐚𝐯𝐞𝐜 𝐬𝐮𝐜𝐜è𝐬!\n✧════════════✧`,
                    'security',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐝é𝐟𝐢𝐧𝐢' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'changepassword': {
                const newPass = args[1];
                const oldPass = args[2];
                
                if (!newPass || !oldPass) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐒𝐲𝐧𝐭𝐚𝐱𝐞: ~bank changepassword [𝐧𝐨𝐮𝐯𝐞𝐚𝐮] [𝐚𝐧𝐜𝐢𝐞𝐧]\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐀𝐫𝐠𝐮𝐦𝐞𝐧𝐭𝐬 𝐦𝐚𝐧𝐪𝐮𝐚𝐧𝐭𝐬' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].password !== oldPass) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐀𝐧𝐜𝐢𝐞𝐧 𝐦𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐢𝐧𝐜𝐨𝐫𝐫𝐞𝐜𝐭!\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐀𝐧𝐜𝐢𝐞𝐧 𝐦𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐢𝐧𝐜𝐨𝐫𝐫𝐞𝐜𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].password = newPass;
                saveBalance(balance);
                
                await sendResponse(
                    `➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ ✅ 𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐜𝐡𝐚𝐧𝐠é 𝐚𝐯𝐞𝐜 𝐬𝐮𝐜𝐜è𝐬!\n✧════════════✧`,
                    'security',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐜𝐡𝐚𝐧𝐠é' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'removepassword': {
                if (!balance[userId].password) {
                    await sendResponse(
                        `➔【𝐈𝐍𝐅𝐎】\n✧════════════✧\n✧ ℹ️ 𝐀𝐮𝐜𝐮𝐧 𝐦𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐝é𝐟𝐢𝐧𝐢!\n✧════════════✧`,
                        'info',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐏𝐚𝐬 𝐝𝐞 𝐦𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐝é𝐟𝐢𝐧𝐢' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].password = null;
                saveBalance(balance);
                
                await sendResponse(
                    `➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ ✅ 𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐬𝐮𝐩𝐩𝐫𝐢𝐦é!\n✧════════════✧`,
                    'security',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐭 𝐝𝐞 𝐩𝐚𝐬𝐬𝐞 𝐬𝐮𝐩𝐩𝐫𝐢𝐦é' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'gamble': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐒𝐲𝐧𝐭𝐚𝐱𝐞: ~bank gamble [𝐦𝐨𝐧𝐭𝐚𝐧𝐭] [𝐦𝐨𝐭𝐝𝐞𝐩𝐚𝐬𝐬𝐞]\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐌𝐨𝐧𝐭𝐚𝐧𝐭 𝐢𝐧𝐯𝐚𝐥𝐢𝐝𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].cash < amount) {
                    await sendResponse(
                        `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭!\n💰 𝐕𝐨𝐮𝐬 𝐚𝐯𝐞𝐳: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].cash -= amount;
                const win = Math.random() < 0.5;
                const winAmount = win ? amount * 2 : 0;
                
                if (win) {
                    balance[userId].cash += winAmount;
                    if (!users[userId].achievements.includes('Gambler')) {
                        users[userId].achievements.push('Gambler');
                    }
                    
                    await sendResponse(
                        `${getBorder()}🎰 𝐉𝐀𝐂𝐊𝐏𝐎𝐓!\n\n💰 𝐏𝐚𝐫𝐢: ${formatNumber(amount)}💲\n🎉 𝐆𝐚𝐢𝐧: ${formatNumber(winAmount)}💲\n💸 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐜𝐚𝐬𝐡: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'gamble',
                        { 𝐫𝐞𝐬𝐮𝐥𝐭: 'WIN', 𝐚𝐦𝐨𝐮𝐧𝐭: winAmount },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    if (balance[userId].insurance) {
                        const refund = Math.floor(amount * 0.5);
                        balance[userId].cash += refund;
                        
                        await sendResponse(
                            `${getBorder()}💸 𝐏𝐄𝐑𝐓𝐄 𝐀𝐒𝐒𝐔𝐑𝐄𝐄!\n\n💰 𝐏𝐚𝐫𝐢: ${formatNumber(amount)}💲\n🛡️ 𝐑𝐞𝐦𝐛𝐨𝐮𝐫𝐬é: ${formatNumber(refund)}💲 (50%)\n💸 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐜𝐚𝐬𝐡: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                            'gamble',
                            { 𝐫𝐞𝐬𝐮𝐥𝐭: 'LOST_INSURED', 𝐫𝐞𝐟𝐮𝐧𝐝: refund },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                    } else {
                        await sendResponse(
                            `${getBorder()}💸 𝐏𝐄𝐑𝐓𝐄!\n\n💰 𝐏𝐚𝐫𝐢: ${formatNumber(amount)}💲\n😢 𝐏𝐞𝐫𝐝𝐮: ${formatNumber(amount)}💲\n💸 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐜𝐚𝐬𝐡: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                            'gamble',
                            { 𝐫𝐞𝐬𝐮𝐥𝐭: 'LOST', 𝐥𝐨𝐬𝐬: amount },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                    }
                }
                break;
            }

            case 'heist': {
                const target = args[1];
                
                if (COOLDOWNS[`heist_${userId}`] && Date.now() - COOLDOWNS[`heist_${userId}`] < 30 * 60 * 1000) {
                    const remaining = Math.ceil((30 * 60 * 1000 - (Date.now() - COOLDOWNS[`heist_${userId}`])) / (60 * 1000));
                    await sendResponse(
                        `➔【𝐂𝐎𝐎𝐋𝐃𝐎𝐖𝐍】\n✧════════════✧\n✧ ⏰ 𝐇𝐞𝐢𝐬𝐭 𝐞𝐧 𝐜𝐨𝐨𝐥𝐝𝐨𝐰𝐧!\n🕒 𝐓𝐞𝐦𝐩𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${remaining} 𝐦𝐢𝐧𝐮𝐭𝐞𝐬\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐇𝐞𝐢𝐬𝐭 𝐞𝐧 𝐜𝐨𝐨𝐥𝐝𝐨𝐰𝐧' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].failedHeists >= 5) {
                    balance[userId].prisonUntil = Date.now() + 60 * 60 * 1000;
                    saveBalance(balance);
                    
                    await sendResponse(
                        `➔【𝐏𝐑𝐈𝐒𝐎𝐍】\n✧════════════✧\n✧ 🚨 𝐓𝐫𝐨𝐩 𝐝'é𝐜𝐡𝐞𝐜𝐬!\n⛓️ 𝐏𝐫𝐢𝐬𝐨𝐧: 1 𝐡𝐞𝐮𝐫𝐞\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐓𝐫𝐨𝐩 𝐝\'é𝐜𝐡𝐞𝐜𝐬 𝐝𝐞 𝐡𝐞𝐢𝐬𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const success = Math.random() < 0.35;
                COOLDOWNS[`heist_${userId}`] = Date.now();
                
                if (success) {
                    let stealAmount = 0;
                    if (target) {
                        if (!balance[target]) {
                            await sendResponse(
                                `➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ 𝐂𝐢𝐛𝐥𝐞 𝐢𝐧𝐭𝐫𝐨𝐮𝐯𝐚𝐛𝐥𝐞!\n✧════════════✧`,
                                'error',
                                { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐢𝐛𝐥𝐞 𝐢𝐧𝐭𝐫𝐨𝐮𝐯𝐚𝐛𝐥𝐞' },
                                displayMode,
                                api,
                                event,
                                userName
                            );
                            return;
                        }
                        
                        stealAmount = Math.min(balance[target].cash * 0.3, 1000000);
                        balance[target].cash -= stealAmount;
                        
                        try {
                            await api.sendMessage(
                                `➔【𝐕𝐎𝐋】\n✧════════════✧\n🚨 𝐕𝐨𝐮𝐬 𝐚𝐯𝐞𝐳 é𝐭é 𝐛𝐫𝐚𝐪𝐮é!\n💰 𝐕𝐨𝐥é: ${formatNumber(stealAmount)}💲\n💸 𝐕𝐨𝐭𝐫𝐞 𝐜𝐚𝐬𝐡: ${formatNumber(balance[target].cash)}💲\n✧════════════✧`,
                                target
                            );
                        } catch {}
                    } else {
                        stealAmount = Math.floor(Math.random() * 500000) + 100000;
                    }
                    
                    balance[userId].cash += stealAmount;
                    balance[userId].failedHeists = 0;
                    
                    if (!users[userId].achievements.includes('Heist Master')) {
                        users[userId].achievements.push('Heist Master');
                    }
                    
                    await sendResponse(
                        `${getBorder()}💰 𝐁𝐑𝐀𝐐𝐔𝐀𝐆𝐄 𝐑𝐄𝐔𝐒𝐒𝐈!\n\n🎯 𝐓𝐲𝐩𝐞: ${target ? '𝐂𝐢𝐛𝐥é' : '𝐁𝐚𝐧𝐪𝐮𝐞'}\n💸 𝐕𝐨𝐥é: ${formatNumber(stealAmount)}💲\n💰 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐜𝐚𝐬𝐡: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'heist',
                        { 𝐫𝐞𝐬𝐮𝐥𝐭: 'SUCCESS', 𝐚𝐦𝐨𝐮𝐧𝐭: stealAmount, 𝐭𝐲𝐩𝐞: target ? 'TARGETED' : 'BANK' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    balance[userId].failedHeists = (balance[userId].failedHeists || 0) + 1;
                    const penalty = Math.min(balance[userId].cash * 0.2, 50000);
                    balance[userId].cash -= penalty;
                    
                    if (balance[userId].failedHeists >= 3) {
                        balance[userId].prisonUntil = Date.now() + 30 * 60 * 1000;
                    }
                    
                    await sendResponse(
                        `${getBorder()}🚔 𝐁𝐑𝐀𝐐𝐔𝐀𝐆𝐄 𝐄𝐂𝐇𝐎𝐔𝐄!\n\n💸 𝐏é𝐧𝐚𝐥𝐢𝐭é: ${formatNumber(penalty)}💲\n❌ 𝐄𝐜𝐡𝐞𝐜𝐬 𝐜𝐨𝐧𝐬é𝐜𝐮𝐭𝐢𝐟𝐬: ${balance[userId].failedHeists}\n${balance[userId].failedHeists >= 3 ? '⛓️ 𝐏𝐫𝐢𝐬𝐨𝐧: 30 𝐦𝐢𝐧𝐮𝐭𝐞𝐬' : ''}\n━━━━━━━━━━━━━━━━`,
                        'heist',
                        { 𝐫𝐞𝐬𝐮𝐥𝐭: 'FAILED', 𝐩𝐞𝐧𝐚𝐥𝐭𝐲: penalty, 𝐟𝐚𝐢𝐥𝐬: balance[userId].failedHeists },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }

            case 'insure':
            case 'insurance': {
                if (subCommand === 'buy') {
                    const cost = 5000;
                    if (balance[userId].cash < cost) {
                        await sendResponse(
                            `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭!\n💰 𝐂𝐨û𝐭: ${formatNumber(cost)}💲\n💸 𝐕𝐨𝐮𝐬 𝐚𝐯𝐞𝐳: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                            'error',
                            { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭' },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                        return;
                    }
                    
                    balance[userId].cash -= cost;
                    balance[userId].insurance = true;
                    
                    if (!users[userId].achievements.includes('Insured')) {
                        users[userId].achievements.push('Insured');
                    }
                    
                    await sendResponse(
                        `${getBorder()}🛡️ 𝐀𝐒𝐒𝐔𝐑𝐀𝐍𝐂𝐄 𝐀𝐂𝐇𝐄𝐓𝐄𝐄!\n\n💰 𝐂𝐨û𝐭: ${formatNumber(cost)}💲\n✅ 𝐏𝐫𝐨𝐭𝐞𝐜𝐭𝐢𝐨𝐧 𝐚𝐜𝐭𝐢𝐯é𝐞 𝐩𝐨𝐮𝐫 24𝐡\n🔒 𝐂𝐨𝐮𝐯𝐫𝐞: 𝐏𝐞𝐫𝐭𝐞𝐬 𝐠𝐚𝐦𝐛𝐥𝐞, é𝐜𝐡𝐞𝐜𝐬 𝐡𝐞𝐢𝐬𝐭\n━━━━━━━━━━━━━━━━`,
                        'insure',
                        { 𝐢𝐧𝐬𝐮𝐫𝐚𝐧𝐜𝐞: 'BOUGHT', 𝐜𝐨𝐬𝐭: cost },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                await sendResponse(
                    `${getBorder()}🛡️ 𝐀𝐒𝐒𝐔𝐑𝐀𝐍𝐂𝐄:\n\n➤ ~bank insure buy\n💡 𝐂𝐨û𝐭: 5,000💲\n✅ 𝐏𝐫𝐨𝐭è𝐠𝐞 𝐯𝐨𝐬 𝐩𝐞𝐫𝐭𝐞𝐬\n━━━━━━━━━━━━━━━━`,
                    'info',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧 𝐚𝐬𝐬𝐮𝐫𝐚𝐧𝐜𝐞' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'vault': {
                const action = args[1]?.toLowerCase();
                const amount = parseInt(args[2]);
                
                if (!action || !amount || amount <= 0) {
                    await sendResponse(
                        `${getBorder()}🔐 𝐂𝐎𝐅𝐅𝐑𝐄-𝐅𝐎𝐑𝐓:\n\n➤ ~bank vault deposit [𝐦𝐨𝐧𝐭𝐚𝐧𝐭]\n➤ ~bank vault withdraw [𝐦𝐨𝐧𝐭𝐚𝐧𝐭]\n💡 𝐒é𝐜𝐮𝐫𝐢𝐬é 𝐜𝐨𝐧𝐭𝐫𝐞 𝐥𝐞𝐬 𝐛𝐫𝐚𝐪𝐮𝐚𝐠𝐞𝐬\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧 𝐜𝐨𝐟𝐟𝐫𝐞-𝐟𝐨𝐫𝐭' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (action === 'deposit') {
                    if (balance[userId].cash < amount) {
                        await sendResponse(
                            `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭!\n✧════════════✧`,
                            'error',
                            { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐚𝐬𝐡 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭' },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                        return;
                    }
                    
                    balance[userId].cash -= amount;
                    balance[userId].vault += amount;
                    
                    await sendResponse(
                        `${getBorder()}🔐 𝐃É𝐏Ô𝐓 𝐕𝐀𝐔𝐋𝐓!\n\n💰 𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(amount)}💲\n🏦 𝐕𝐚𝐮𝐥𝐭: ${formatNumber(balance[userId].vault)}💲\n💸 𝐂𝐚𝐬𝐡 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'vault',
                        { 𝐚𝐜𝐭𝐢𝐨𝐧: 'DEPOSIT', 𝐚𝐦𝐨𝐮𝐧𝐭: amount, 𝐯𝐚𝐮𝐥𝐭: balance[userId].vault },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else if (action === 'withdraw') {
                    if (balance[userId].vault < amount) {
                        await sendResponse(
                            `➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ 𝐅𝐨𝐧𝐝𝐬 𝐯𝐚𝐮𝐥𝐭 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬!\n✧════════════✧`,
                            'error',
                            { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐅𝐨𝐧𝐝𝐬 𝐯𝐚𝐮𝐥𝐭 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐬𝐚𝐧𝐭𝐬' },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                        return;
                    }
                    
                    balance[userId].vault -= amount;
                    balance[userId].cash += amount;
                    
                    await sendResponse(
                        `${getBorder()}🔓 𝐑𝐄𝐓𝐑𝐀𝐈𝐓 𝐕𝐀𝐔𝐋𝐓!\n\n💰 𝐌𝐨𝐧𝐭𝐚𝐧𝐭: ${formatNumber(amount)}💲\n🏦 𝐕𝐚𝐮𝐥𝐭 𝐫𝐞𝐬𝐭𝐚𝐧𝐭: ${formatNumber(balance[userId].vault)}💲\n💸 𝐍𝐨𝐮𝐯𝐞𝐚𝐮 𝐜𝐚𝐬𝐡: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'vault',
                        { 𝐚𝐜𝐭𝐢𝐨𝐧: 'WITHDRAW', 𝐚𝐦𝐨𝐮𝐧𝐭: amount, 𝐯𝐚𝐮𝐥𝐭: balance[userId].vault },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }

            case 'top':
            case 'leaderboard': {
                const sorted = Object.entries(balance)
                    .filter(([uid, data]) => data.bank > 0)
                    .sort(([, a], [, b]) => b.bank - a.bank)
                    .slice(0, 10);
                
                if (sorted.length === 0) {
                    await sendResponse(
                        `${getBorder()}📊 𝐂𝐋𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓 𝐕𝐈𝐃𝐄\n\n𝐀𝐮𝐜𝐮𝐧 𝐧𝐢𝐧𝐣𝐚 𝐧'𝐚 𝐞𝐧𝐜𝐨𝐫𝐞 𝐝𝐞 𝐟𝐨𝐧𝐝𝐬 𝐞𝐧 𝐛𝐚𝐧𝐪𝐮𝐞!\n━━━━━━━━━━━━━━━━`,
                        'top',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐥𝐚𝐬𝐬𝐞𝐦𝐞𝐧𝐭 𝐯𝐢𝐝𝐞' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                let leaderboard = `${getBorder()}🏆 𝐓𝐎𝐏 𝟏𝟎 𝐁𝐀𝐍𝐐𝐔𝐄 🏆\n\n`;
                for (let i = 0; i < sorted.length; i++) {
                    const [uid, data] = sorted[i];
                    const name = users[uid]?.name || `𝐔𝐬𝐞𝐫_${uid}`;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
                    leaderboard += `${medal} ${i + 1}. ${name}: ${formatNumber(data.bank)}💲\n`;
                }
                
                const topUser = sorted[0];
                const topName = users[topUser[0]]?.name || `𝐔𝐬𝐞𝐫_${topUser[0]}`;
                leaderboard += `\n👑 ${topName} 𝐝𝐨𝐦𝐢𝐧𝐞 𝐥𝐚 𝐛𝐚𝐧𝐪𝐮𝐞!\n━━━━━━━━━━━━━━━━`;
                
                const topData = {};
                sorted.forEach(([uid, data], i) => {
                    topData[`${i + 1}. ${users[uid]?.name || uid.substring(0, 6)}`] = formatNumber(data.bank) + '💲';
                });
                
                await sendResponse(leaderboard, 'top', topData, displayMode, api, event, userName);
                break;
            }

            case 'daily': {
                const now = Date.now();
                const lastDaily = balance[userId].lastDaily || 0;
                
                if (now - lastDaily < 24 * 60 * 60 * 1000) {
                    const next = new Date(lastDaily + 24 * 60 * 60 * 1000);
                    const hours = Math.ceil((next - now) / (60 * 60 * 1000));
                    
                    await sendResponse(
                        `➔【𝐂𝐎𝐎𝐋𝐃𝐎𝐖𝐧】\n✧════════════✧\n⏰ 𝐃𝐚𝐢𝐥𝐲 𝐝é𝐣à 𝐫é𝐜𝐮𝐩é𝐫é!\n🕒 𝐏𝐫𝐨𝐜𝐡𝐚𝐢𝐧: ${hours} 𝐡𝐞𝐮𝐫𝐞𝐬\n✧════════════✧`,
                        'error',
                        { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐃𝐚𝐢𝐥𝐲 𝐝é𝐣à 𝐫é𝐜𝐮𝐩é𝐫é' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const baseReward = 1000;
                const streakBonus = Math.min(balance[userId].dailyStreak || 0, 30) * 50;
                const randomBonus = Math.floor(Math.random() * 500);
                const totalReward = baseReward + streakBonus + randomBonus;
                
                balance[userId].cash += totalReward;
                balance[userId].dailyStreak = (balance[userId].dailyStreak || 0) + 1;
                balance[userId].lastDaily = now;
                
                if (!users[userId].achievements.includes('Daily Player')) {
                    users[userId].achievements.push('Daily Player');
                }
                
                if (balance[userId].dailyStreak % 7 === 0) {
                    balance[userId].cash += 10000;
                    
                    await sendResponse(
                        `${getBorder()}🎉 𝐃𝐀𝐈𝐋𝐘 𝐱𝟕!\n\n💰 𝐁𝐚𝐬𝐞: ${formatNumber(baseReward)}💲\n🔥 𝐒𝐭𝐫𝐞𝐚𝐤: ${balance[userId].dailyStreak} 𝐣𝐨𝐮𝐫𝐬\n🎲 𝐁𝐨𝐧𝐮𝐬: ${formatNumber(randomBonus)}💲\n🎁 𝐒𝐩é𝐜𝐢𝐚𝐥 7𝐣: +10,000💲\n💸 𝐓𝐨𝐭𝐚𝐥: ${formatNumber(totalReward + 10000)}💲\n━━━━━━━━━━━━━━━━`,
                        'daily',
                        { 𝐫𝐞𝐰𝐚𝐫𝐝: totalReward + 10000, 𝐬𝐭𝐫𝐞𝐚𝐤: balance[userId].dailyStreak, 𝐬𝐩𝐞𝐜𝐢𝐚𝐥: true },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    await sendResponse(
                        `${getBorder()}🎉 𝐃𝐀𝐈𝐋𝐘 𝐑𝐄𝐂𝐔𝐏𝐄𝐑𝐄!\n\n💰 𝐁𝐚𝐬𝐞: ${formatNumber(baseReward)}💲\n🔥 𝐒𝐭𝐫𝐞𝐚𝐤: ${balance[userId].dailyStreak} 𝐣𝐨𝐮𝐫𝐬\n🎲 𝐁𝐨𝐧𝐮𝐬: ${formatNumber(randomBonus)}💲\n💸 𝐓𝐨𝐭𝐚𝐥: ${formatNumber(totalReward)}💲\n━━━━━━━━━━━━━━━━`,
                        'daily',
                        { 𝐫𝐞𝐰𝐚𝐫𝐝: totalReward, 𝐬𝐭𝐫𝐞𝐚𝐤: balance[userId].dailyStreak },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }

            case 'stats': {
                if (subCommand === 'global' && isVIP) {
                    const totalUsers = Object.keys(balance).length;
                    const totalMoney = Object.values(balance).reduce((sum, data) => sum + data.bank + data.cash, 0);
                    const totalDebt = Object.values(balance).reduce((sum, data) => sum + data.debt, 0);
                    const vipCount = Object.values(users).filter(u => u.vip).length;
                    
                    await sendResponse(
                        `${getBorder()}📊 𝐒𝐓𝐀𝐓𝐒 𝐆𝐋𝐎𝐁𝐀𝐋𝐄𝐒\n\n👥 𝐔𝐭𝐢𝐥𝐢𝐬𝐚𝐭𝐞𝐮𝐫𝐬: ${totalUsers}\n💰 𝐀𝐫𝐠𝐞𝐧𝐭 𝐭𝐨𝐭𝐚𝐥: ${formatNumber(totalMoney)}💲\n🎯 𝐃𝐞𝐭𝐭𝐞 𝐭𝐨𝐭𝐚𝐥𝐞: ${formatNumber(totalDebt)}💲\n👑 𝐕𝐈𝐏𝐬: ${vipCount}\n🏦 𝐓𝐫𝐚𝐧𝐬𝐚𝐜𝐭𝐢𝐨𝐧𝐬: ${security.transactions?.length || 0}\n━━━━━━━━━━━━━━━━`,
                        'stats',
                        { 𝐮𝐬𝐞𝐫𝐬: totalUsers, 𝐦𝐨𝐧𝐞𝐲: totalMoney, 𝐝𝐞𝐛𝐭: totalDebt, 𝐯𝐢𝐩𝐬: vipCount },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const achievements = users[userId].achievements.join(', ') || '𝐀𝐮𝐜𝐮𝐧';
                const karma = balance[userId].karma || 0;
                const karmaLevel = karma < 0 ? '𝐑𝐢𝐬𝐪𝐮é ⚠️' : karma < 10 ? '𝐍𝐨𝐫𝐦𝐚𝐥' : karma < 50 ? '𝐅𝐢𝐚𝐛𝐥𝐞 ✅' : '𝐋é𝐠𝐞𝐧𝐝𝐚𝐢𝐫𝐞 👑';
                
                await sendResponse(
                    `${getBorder()}📊 𝐕𝐎𝐒 𝐒𝐓𝐀𝐓𝐒\n\n👤 𝐍𝐨𝐦: ${userName}\n🎯 𝐔𝐈𝐃: ${userId}\n🏦 𝐁𝐚𝐧𝐪𝐮𝐞: ${formatNumber(balance[userId].bank)}💲\n💰 𝐂𝐚𝐬𝐡: ${formatNumber(balance[userId].cash)}💲\n🔐 𝐕𝐚𝐮𝐥𝐭: ${formatNumber(balance[userId].vault)}💲\n🎯 𝐃𝐞𝐭𝐭𝐞: ${formatNumber(balance[userId].debt)}💲\n❤️ 𝐊𝐚𝐫𝐦𝐚: ${karma} (${karmaLevel})\n🏆 𝐀𝐜𝐡𝐢𝐞𝐯𝐞𝐦𝐞𝐧𝐭𝐬: ${achievements}\n🔥 𝐃𝐚𝐢𝐥𝐲 𝐒𝐭𝐫𝐞𝐚𝐤: ${balance[userId].dailyStreak || 0} 𝐣𝐨𝐮𝐫𝐬\n━━━━━━━━━━━━━━━━`,
                    'stats',
                    { 𝐛𝐚𝐧𝐤: balance[userId].bank, 𝐜𝐚𝐬𝐡: balance[userId].cash, 𝐯𝐚𝐮𝐥𝐭: balance[userId].vault, 𝐝𝐞𝐛𝐭: balance[userId].debt, 𝐤𝐚𝐫𝐦𝐚: karma, 𝐚𝐜𝐡𝐢𝐞𝐯𝐞𝐦𝐞𝐧𝐭𝐬: achievements },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            case 'help':
            case 'menu': {
                await sendResponse(
                    LANG[userLang].menu,
                    'menu',
                    { '𝐌𝐨𝐝𝐞 𝐚𝐜𝐭𝐮𝐞𝐥': displayMode.toUpperCase(), '𝐋𝐚𝐧𝐠𝐮𝐞': userLang.toUpperCase(), '𝐒𝐭𝐚𝐭𝐮𝐭': isVIP ? '𝐕𝐈𝐏 🌟' : '𝐒𝐭𝐚𝐧𝐝𝐚𝐫𝐝' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }

            default: {
                await sendResponse(
                    `${getBorder()}❌ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄 𝐈𝐍𝐂𝐎𝐍𝐍𝐔𝐄\n\n💡 𝐓𝐚𝐩𝐞𝐳 ~bank 𝐩𝐨𝐮𝐫 𝐯𝐨𝐢𝐫 𝐥𝐞 𝐦𝐞𝐧𝐮\n🔍 𝐎𝐮 ~bank help 𝐩𝐨𝐮𝐫 𝐥'𝐚𝐢𝐝𝐞\n━━━━━━━━━━━━━━━━`,
                    'error',
                    { 𝐦𝐞𝐬𝐬𝐚𝐠𝐞: '𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞 𝐢𝐧𝐜𝐨𝐧𝐧𝐮𝐞' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
        }

        saveBalance(balance);
        saveUsers(users);
        saveSecurity(security);
    }
};