const axios = require('axios');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const API_BASE = "https://quiz-bot-octavio-fadil.vercel.app";
const API_HEADERS = { 'x-api-key': 'fd-uchiha-octavio-quiz' };
const API_TIMEOUT = { question: 22000, default: 8000 };
const TIMEOUTS = { QUESTION: 22000, JOIN: 30000, CONFIG: 40000, CHOICE: 40000 };
const NAME_MAX_LEN = 30;

const activeGames = new Map();
const nameCache = new Map();
const langSettings = new Map();
const NAME_CACHE_TTL = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, cached] of nameCache.entries()) {
    if (now - cached.ts > NAME_CACHE_TTL) nameCache.delete(id);
  }
}, NAME_CACHE_TTL);

const RANKS = [
  [10000, 'Oracle'],
  [5000, 'Encyclopediste'],
  [2500, 'Savant'],
  [1000, 'Lettre'],
  [500, 'Academicien'],
  [250, 'Erudit'],
  [100, 'Curieux'],
  [0, 'Novice'],
];

const I18N = {
  fr: {
    start_solo: 'Mode Solo — bonne chance !',
    start_team: 'Quiz en equipe — que la meilleure equipe gagne !',
    stopped: 'Quiz arrete.',
    already_running: 'Un quiz est deja en cours dans ce salon.',
    none_running: 'Aucun quiz en cours.',
    bad_start_cmd: 'Usage : quiz start solo  ou  quiz start team',
    q_header: (i, total) => `Question ${i}/${total} — 20 secondes`,
    q_reply_hint: 'Repondez a ce message par reply',
    q_letter_hint: 'Repondez a ce message par reply avec la lettre : A, B, C ou D',
    timeout: (ans) => `Temps ecoule. La reponse etait : ${ans}`,
    end_title: 'FIN DU QUIZ',
    victory_title: 'VICTOIRE',
    team_win: (name) => `Victoire : ${name}`,
    team_draw: 'Egalite.',
    no_score: 'Aucun point marque.',
    join_already: 'Vous etes deja dans une equipe.',
    join_full: (name) => `L\'equipe ${name} est deja complete.`,
    join_ok: (name, team) => `${name} a rejoint ${team}.`,
    join_timeout: (a, b) => `Recrutement termine pour ${a}. Passage a la phase ${b}.`,
    join_invite: (team, s) => `Equipe ${team} — tapez "join" pour vous inscrire  (${s}s)`,
    join_closed: 'La phase de recrutement est terminee.',
    no_players: 'Aucun joueur inscrit. Quiz annule.',
    cfg_cat: 'Choisissez une categorie en tapant le numero (40 secondes) :\n\n1. Culture generale\n2. Mangas et Anime\n3. Histoire\n4. Geographie\n5. Sciences\n6. Arts\n7. Sport\n8. Cinema\n9. Autre — tapez le nom',
    cfg_diff: (cat) => `Categorie : ${cat}\n\nChoisissez la difficulte (40 secondes) :\n\n1. Facile\n2. Moyen\n3. Difficile`,
    cfg_total: (diff) => `Difficulte : ${diff}\n\nCombien de questions ? Tapez un nombre entre 5 et 50\n(defaut 20 — 40 secondes)`,
    cfg_sugg: (n) => `${n} questions.\n\nVoulez-vous des suggestions de reponse A B C D ?\nTapez 1 pour Oui, tapez 2 pour Non  (40 secondes)`,
    cfg_teamA: 'Quel sera le nom de l\'Equipe A ? Tapez le nom (40 secondes)',
    cfg_teamB: (a) => `Equipe A : ${a}\n\nQuel sera le nom de l\'Equipe B ? Tapez le nom (40 secondes)`,
    cfg_size: (b) => `Equipe B : ${b}\n\nFormat d\'equipe (40 secondes) :\n\n1. Limite — 5 joueurs maximum par equipe\n2. Libre — aucune limite`,
    cfg_teamA_go: (team, s) => `Equipe ${team} — tapez "join" pour vous inscrire  (${s}s)`,
    cfg_custom: 'Tapez le nom de votre categorie personnalisee (40 secondes)',
    default_cat: 'Culture generale',
    default_diff: 'moyen',
    default_teamA: 'Equipe A',
    default_teamB: 'Equipe B',
    correct_solo_rank: (name, pts, total, rank) => `Bonne reponse ${name} ! +${pts} pts  (total : ${total} pts)  —  ${rank}`,
    solo_win_rank: (name, pts, rank) => `Gagnant : ${name}  —  ${pts} pts  [ ${rank} ]`,
    rank_title: 'CLASSEMENT — Top 10',
    rank_line: (i, name, pts) => `${i}.  ${name}  —  ${pts} pts`,
    rank_err: 'Impossible de charger le classement pour le moment.',
    profile_header: (name, rank) => `${name}\nRang : ${rank}`,
    profile_stats: (pts, streak, best) => `Points : ${pts}\nSerie en cours : ${streak}\nMeilleure serie : ${best}`,
    error_api: 'Erreur de connexion. Le quiz est arrete.',
    lang_changed: 'Langue changee : Francais',
    rules: 'REGLES DU JEU\n\nSolo : repondez aux questions par reply\nEquipe : rejoignez une equipe en tapant "join"\nAvec suggestions : repondez par reply avec la lettre A, B, C ou D\nSans suggestions : repondez librement par reply\n\n10 points par bonne reponse\nTimer de 20 secondes par question',
    credits: 'Quiz Bot\nConcu par Octavio\nMaintenu par L\'Uchiha Perdu',
    cmd_list: 'COMMANDES DISPONIBLES\n\nquiz start solo        — Demarrer un quiz en mode solo\nquiz start team        — Demarrer un quiz en equipe\nquiz stop              — Arreter le quiz en cours\nquiz classement        — Afficher le top 10 des joueurs\nquiz profil            — Afficher votre profil\nquiz regle             — Afficher les regles du jeu\nquiz credits           — Afficher les credits\nquiz changelang fr     — Passer en francais\nquiz changelang en     — Switch to English',
    lang_bad: 'Usage : quiz changelang fr  pour le francais  |  quiz changelang en  pour l\'anglais',
    not_owner: 'Seul le createur du quiz peut l\'arreter.',
    cfg_timeout_default: (what) => `Temps ecoule — aucune reponse. Valeur par defaut : ${what}`,
    cfg_hint_choice: 'Repondez uniquement avec 1 ou 2.',
    cfg_hint_total: 'Entrez un nombre entier entre 5 et 50.',
    cfg_hint_category: 'Tapez un chiffre de 1 a 9.',
    cfg_hint_difficulty: 'Tapez 1 pour Facile, 2 pour Moyen ou 3 pour Difficile.',
  },
  en: {
    start_solo: 'Solo mode — good luck!',
    start_team: 'Team quiz — may the best team win!',
    stopped: 'Quiz stopped.',
    already_running: 'A quiz is already running in this chat.',
    none_running: 'No quiz in progress.',
    bad_start_cmd: 'Usage: quiz start solo  or  quiz start team',
    q_header: (i, total) => `Question ${i}/${total} — 20 seconds`,
    q_reply_hint: 'Reply to this message with your answer',
    q_letter_hint: 'Reply to this message with the letter: A, B, C or D',
    timeout: (ans) => `Time is up. The answer was: ${ans}`,
    end_title: 'QUIZ OVER',
    victory_title: 'VICTORY',
    team_win: (name) => `Winner: ${name}`,
    team_draw: 'Draw.',
    no_score: 'No points scored.',
    join_already: 'You are already in a team.',
    join_full: (name) => `Team ${name} is already full.`,
    join_ok: (name, team) => `${name} joined ${team}.`,
    join_timeout: (a, b) => `Recruitment over for ${a}. Phase ${b}.`,
    join_invite: (team, s) => `Team ${team} — type "join" to register  (${s}s)`,
    join_closed: 'Recruitment phase is over.',
    no_players: 'No players registered. Quiz cancelled.',
    cfg_cat: 'Choose a category by typing the number (40 seconds):\n\n1. General Knowledge\n2. Manga and Anime\n3. History\n4. Geography\n5. Science\n6. Arts\n7. Sports\n8. Cinema\n9. Custom — type your own name',
    cfg_diff: (cat) => `Category: ${cat}\n\nChoose the difficulty (40 seconds):\n\n1. Easy\n2. Medium\n3. Hard`,
    cfg_total: (diff) => `Difficulty: ${diff}\n\nHow many questions? Type a number between 5 and 50\n(default 20 — 40 seconds)`,
    cfg_sugg: (n) => `${n} questions.\n\nDo you want answer suggestions A B C D?\nType 1 for Yes, type 2 for No  (40 seconds)`,
    cfg_teamA: 'What will be the name of Team A? Type the name (40 seconds)',
    cfg_teamB: (a) => `Team A: ${a}\n\nWhat will be the name of Team B? Type the name (40 seconds)`,
    cfg_size: (b) => `Team B: ${b}\n\nTeam format (40 seconds):\n\n1. Limited — max 5 players per team\n2. Open — no limit`,
    cfg_teamA_go: (team, s) => `Team ${team} — type "join" to register  (${s}s)`,
    cfg_custom: 'Type your custom category name (40 seconds)',
    default_cat: 'General Knowledge',
    default_diff: 'medium',
    default_teamA: 'Team A',
    default_teamB: 'Team B',
    correct_solo_rank: (name, pts, total, rank) => `Correct ${name}! +${pts} pts  (total: ${total} pts)  —  ${rank}`,
    solo_win_rank: (name, pts, rank) => `Winner: ${name}  —  ${pts} pts  [ ${rank} ]`,
    rank_title: 'LEADERBOARD — Top 10',
    rank_line: (i, name, pts) => `${i}.  ${name}  —  ${pts} pts`,
    rank_err: 'Unable to load the leaderboard.',
    profile_header: (name, rank) => `${name}\nRank: ${rank}`,
    profile_stats: (pts, streak, best) => `Points: ${pts}\nCurrent streak: ${streak}\nBest streak: ${best}`,
    error_api: 'Connection error. The quiz has been stopped.',
    lang_changed: 'Language changed: English',
    rules: 'RULES\n\nSolo: reply to questions directly\nTeam: join a team by typing "join"\nWith suggestions: reply with A, B, C or D\nWithout suggestions: reply freely\n\n10 points per correct answer\n20 second timer per question',
    credits: 'Quiz Bot\nDesigned by Octavio\nMaintained by L\'Uchiha Perdu',
    cmd_list: 'AVAILABLE COMMANDS\n\nquiz start solo        — Start a solo quiz\nquiz start team        — Start a team quiz\nquiz stop              — Stop the current quiz\nquiz leaderboard       — Show the top 10 players\nquiz profile           — Show your profile\nquiz rules             — Show the rules\nquiz credits           — Show credits\nquiz changelang fr     — Passer en francais\nquiz changelang en     — Switch to English',
    lang_bad: 'Usage: quiz changelang fr  for French  |  quiz changelang en  for English',
    not_owner: 'Only the quiz creator can stop it.',
    cfg_timeout_default: (what) => `Time expired — no answer. Default: ${what}`,
    cfg_hint_choice: 'Please reply with 1 or 2 only.',
    cfg_hint_total: 'Please enter a whole number between 5 and 50.',
    cfg_hint_category: 'Please type a number from 1 to 9.',
    cfg_hint_difficulty: 'Please type 1 for Easy, 2 for Medium or 3 for Hard.',
  },
};

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n\t\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 500);
}

function normalize(str) {
  return str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getLang(tid) { return langSettings.get(tid) || 'fr'; }

function t(tid, key, ...args) {
  const lang = getLang(tid);
  const val = (I18N[lang] ?? I18N.fr)[key] ?? I18N.fr[key];
  if (val === undefined) return key;
  return typeof val === 'function' ? val(...args) : val;
}

function getRank(pts) {
  for (const [threshold, label] of RANKS) if (pts >= threshold) return label;
  return RANKS[RANKS.length - 1][1];
}

function regReply(msgID, data) {
  try { global.GoatBot.onReply.set(msgID, { commandName: 'quiz', ...data }); } catch(e) {}
}

function unregReply(msgID) {
  try { if (msgID) global.GoatBot.onReply.delete(msgID); } catch(e) {}
}

let botName = 'QuizBot';
let botNameFetched = false;

async function fetchBotName(api) {
  if (botNameFetched) return;
  botNameFetched = true;
  try {
    const uid = api.getCurrentUserID();
    if (!uid) return;
    const info = await api.getUserInfo(uid);
    if (info[uid]?.name) botName = info[uid].name;
  } catch(e) { botNameFetched = false; }
}

async function getUserName(api, id) {
  const cached = nameCache.get(id);
  if (cached && Date.now() - cached.ts < NAME_CACHE_TTL) return cached.name;
  try {
    const info = await api.getUserInfo(id);
    const name = sanitize(info[id]?.name || 'Joueur');
    nameCache.set(id, { name, ts: Date.now() });
    return name;
  } catch(e) { return 'Inconnu'; }
}

function makeGame() {
  return {
    active: false, mode: null, category: null, difficulty: null,
    total: 20, suggestions: false, teamSize: 'libre',
    teamAName: null, teamBName: null,
    teamA: [], teamB: [], teamAScore: 0, teamBScore: 0,
    scores: {}, sessionCorrect: {},
    currentQuestion: null, answer: null, suggestionsList: null,
    messageID: null, timer: null, timerEnd: 0, index: 0,
    configStep: null, configLock: false,
    joinPhase: null, joinTimeout: null,
    questionLock: false, ownerID: null,
    choiceTimeouts: {}, attemptedThisQuestion: new Set(),
  };
}

async function apiPost(p, data) {
  const to = p.includes('/quiz/question') ? API_TIMEOUT.question : API_TIMEOUT.default;
  return axios.post(`${API_BASE}${p}`, data, { headers: API_HEADERS, timeout: to });
}
async function apiGet(p) {
  return axios.get(`${API_BASE}${p}`, { headers: API_HEADERS, timeout: API_TIMEOUT.default });
}
async function apiDelete(p) {
  return axios.delete(`${API_BASE}${p}`, { headers: API_HEADERS, timeout: API_TIMEOUT.default });
}

async function saveGameState(threadID) {
  const g = activeGames.get(threadID);
  if (!g) return;
  try {
    await apiPost('/game/save', {
      threadId: threadID,
      gameState: {
        active: g.active, mode: g.mode, category: g.category,
        difficulty: g.difficulty, total: g.total, suggestions: g.suggestions,
        teamSize: g.teamSize, teamAName: g.teamAName, teamBName: g.teamBName,
        teamA: g.teamA, teamB: g.teamB, teamAScore: g.teamAScore, teamBScore: g.teamBScore,
        scores: g.scores, sessionCorrect: g.sessionCorrect,
        currentQuestion: g.currentQuestion, answer: g.answer,
        suggestionsList: g.suggestionsList, messageID: g.messageID,
        timerEnd: g.timerEnd, index: g.index, ownerID: g.ownerID,
        attemptedThisQuestion: [...g.attemptedThisQuestion],
      },
    });
  } catch(e) { console.error('[saveGameState]', e.message); }
}

function announce(api, threadID, text) {
  return api.sendMessage({ body: `—————«•»—————\n${text}\n—————«•»—————` }, threadID);
}
function plain(api, threadID, text) {
  return api.sendMessage({ body: text }, threadID);
}

function clearAllTimeouts(game) {
  if (game.timer) { clearTimeout(game.timer); game.timer = null; }
  if (game.joinTimeout) { clearTimeout(game.joinTimeout); game.joinTimeout = null; }
  Object.values(game.choiceTimeouts || {}).forEach(clearTimeout);
  game.choiceTimeouts = {};
}

async function sendImage(api, threadID, buffer) {
  const tmp = path.join(__dirname, `quiz_${threadID}_${Date.now()}.png`);
  fs.writeFileSync(tmp, buffer);
  try {
    await api.sendMessage({ attachment: fs.createReadStream(tmp) }, threadID);
  } finally {
    try { fs.unlinkSync(tmp); } catch(e) {}
  }
}

async function stopGame(threadID, api, silent = false) {
  const game = activeGames.get(threadID);
  if (!game || !game.active) return;
  clearAllTimeouts(game);
  unregReply(game.messageID);
  game.active = false;
  game.configStep = null;
  game.configLock = false;
  game.questionLock = false;
  game.messageID = null;
  game.joinPhase = null;
  game.attemptedThisQuestion = new Set();
  await apiDelete(`/game/stop/${threadID}`).catch(() => {});
  if (!silent) await plain(api, threadID, t(threadID, 'stopped')).catch(() => {});
  activeGames.delete(threadID);
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let cur = '';
    for (const w of para.split(' ')) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

async function drawQuestion(question, index, total) {
  const mc = createCanvas(800, 100);
  const mctx = mc.getContext('2d');
  mctx.font = '22px Arial';
  const lines = wrapText(mctx, sanitize(question), 740);
  const h = Math.max(300, 130 + lines.length * 38 + 30);
  const canvas = createCanvas(800, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 800, h);
  ctx.fillStyle = '#c0392b'; ctx.font = 'bold 18px Arial';
  ctx.fillText(`${index} / ${total}`, 30, 44);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(30, 54); ctx.lineTo(770, 54); ctx.stroke();
  ctx.fillStyle = '#ecf0f1'; ctx.font = '22px Arial';
  let y = 100;
  for (const line of lines) { ctx.fillText(line, 30, y); y += 38; }
  return canvas.toBuffer();
}

async function drawVictory(winner, ws, loser, ls, victoryTitle) {
  const canvas = createCanvas(800, 380);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f3460'; ctx.fillRect(0, 0, 800, 380);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 780, 360);
  ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 36px Arial';
  const title = sanitize(victoryTitle || 'VICTOIRE').slice(0, 30);
  ctx.fillText(title, (800 - ctx.measureText(title).width) / 2, 80);
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 28px Arial';
  const wt = sanitize(winner).slice(0, 30);
  ctx.fillText(wt, (800 - ctx.measureText(wt).width) / 2, 160);
  ctx.fillStyle = '#ecf0f1'; ctx.font = '24px Arial';
  const st = `${ws} pts`;
  ctx.fillText(st, (800 - ctx.measureText(st).width) / 2, 210);
  ctx.fillStyle = '#7f8c8d'; ctx.font = '18px Arial';
  const lt = `${sanitize(loser).slice(0, 30)} : ${ls} pts`;
  ctx.fillText(lt, (800 - ctx.measureText(lt).width) / 2, 290);
  return canvas.toBuffer();
}

async function drawStart(mode, teamAName, teamBName) {
  const canvas = createCanvas(800, 360);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#16213e'; ctx.fillRect(0, 0, 800, 360);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 780, 340);
  ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 32px Arial'; ctx.fillText('QUIZ', 360, 70);
  if (mode === 'team') {
    ctx.font = '24px Arial';
    ctx.fillStyle = '#e74c3c'; ctx.fillText(sanitize(teamAName).slice(0, 30), 300, 170);
    ctx.fillStyle = '#3498db'; ctx.fillText(sanitize(teamBName).slice(0, 30), 300, 250);
  } else {
    ctx.fillStyle = '#bdc3c7'; ctx.font = '24px Arial'; ctx.fillText('Solo', 380, 190);
  }
  return canvas.toBuffer();
}

async function buildTeamTable(api, threadID) {
  const game = activeGames.get(threadID);
  const [namesA, namesB] = await Promise.all([
    Promise.all(game.teamA.map(id => getUserName(api, id))),
    Promise.all(game.teamB.map(id => getUserName(api, id))),
  ]);
  const linesA = game.teamA.map((id, i) => `  ${namesA[i]}  —  ${game.scores[id] || 0} pts`);
  const linesB = game.teamB.map((id, i) => `  ${namesB[i]}  —  ${game.scores[id] || 0} pts`);
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return [
    `${game.teamAName}  [ ${game.teamAScore} pts ]`, ...linesA, '',
    `${game.teamBName}  [ ${game.teamBScore} pts ]`, ...linesB, '',
    `━━━━━━━━━━━━━━━━━━`, `${heure}  |  ${botName}`,
  ].join('\n');
}

async function nextQuestion(api, threadID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || game.questionLock) return;
  game.questionLock = true;

  unregReply(game.messageID);
  game.messageID = null;
  if (game.timer) { clearTimeout(game.timer); game.timer = null; }

  try {
    if (game.index >= game.total) {
      game.questionLock = false;
      await endGame(api, threadID);
      return;
    }

    game.index++;
    game.attemptedThisQuestion = new Set();

    const res = await apiPost('/quiz/question', {
      mode: game.suggestions ? 'suggestions' : 'free',
      category: game.category, difficulty: game.difficulty, threadId: threadID,
    });

    if (!activeGames.get(threadID)?.active) return;

    const q = res.data;
    if (!q?.question || !q?.answer) throw new Error('API invalide');

    game.currentQuestion = sanitize(q.question);
    game.answer = normalize(sanitize(q.answer));
    game.suggestionsList = Array.isArray(q.suggestions) ? q.suggestions.map(s => sanitize(s)) : null;

    await apiPost('/question/used', { question: q.question, threadId: threadID }).catch(() => {});

    let msg = `${t(threadID, 'q_header', game.index, game.total)}\n\n${game.currentQuestion}`;
    if (game.suggestionsList) {
      msg += '\n\n' + game.suggestionsList.map((s, i) => `${String.fromCharCode(65 + i)}.  ${s}`).join('\n');
      msg += `\n\n${t(threadID, 'q_letter_hint')}`;
    } else {
      msg += `\n\n${t(threadID, 'q_reply_hint')}`;
    }

    const sent = await announce(api, threadID, msg);

    if (!activeGames.get(threadID)?.active) return;

    game.messageID = sent.messageID;
    regReply(sent.messageID, { type: 'quiz_answer', threadID });

    try {
      const img = await drawQuestion(game.currentQuestion, game.index, game.total);
      await sendImage(api, threadID, img);
    } catch(e) { console.error('[nextQuestion img]', e.message); }

    game.timerEnd = Date.now() + TIMEOUTS.QUESTION;
    game.questionLock = false;

    const capturedMsgID = sent.messageID;
    game.timer = setTimeout(async () => {
      const g = activeGames.get(threadID);
      if (!g || !g.active || g.messageID !== capturedMsgID || g.questionLock) return;
      g.questionLock = true;
      unregReply(capturedMsgID);
      g.messageID = null;
      try { await plain(api, threadID, t(threadID, 'timeout', g.answer)); } catch(e) {}
      g.questionLock = false;
      await nextQuestion(api, threadID);
    }, TIMEOUTS.QUESTION);

    saveGameState(threadID).catch(() => {});

  } catch(err) {
    console.error('[nextQuestion]', err.message);
    game.questionLock = false;
    if (activeGames.get(threadID)?.active) {
      await plain(api, threadID, t(threadID, 'error_api')).catch(() => {});
      await stopGame(threadID, api, true);
    }
  }
}

async function endGame(api, threadID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active) return;
  clearAllTimeouts(game);
  unregReply(game.messageID);
  game.active = false;

  let summary = `${t(threadID, 'end_title')}\n\n`;
  let winner = '', ws = 0, loser = '', ls = 0;

  if (game.mode === 'team') {
    summary += `${game.teamAName} : ${game.teamAScore} pts\n${game.teamBName} : ${game.teamBScore} pts\n\n`;
    if (game.teamAScore > game.teamBScore) {
      summary += t(threadID, 'team_win', game.teamAName);
      winner = game.teamAName; ws = game.teamAScore; loser = game.teamBName; ls = game.teamBScore;
    } else if (game.teamBScore > game.teamAScore) {
      summary += t(threadID, 'team_win', game.teamBName);
      winner = game.teamBName; ws = game.teamBScore; loser = game.teamAName; ls = game.teamAScore;
    } else {
      summary += t(threadID, 'team_draw');
    }
  } else {
    const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length) {
      const [wid, wpts] = sorted[0];
      const wname = await getUserName(api, wid);
      summary += t(threadID, 'solo_win_rank', wname, wpts, getRank(wpts));
      winner = wname; ws = wpts;
      if (sorted.length > 1) { loser = await getUserName(api, sorted[1][0]); ls = sorted[1][1]; }
    } else { summary += t(threadID, 'no_score'); }
  }

  await announce(api, threadID, summary);
  if (winner && loser) {
    try {
      const img = await drawVictory(winner, ws, loser, ls, t(threadID, 'victory_title'));
      await sendImage(api, threadID, img);
    } catch(e) { console.error('[endGame img]', e.message); }
  }
  await apiDelete(`/game/stop/${threadID}`).catch(() => {});
  activeGames.delete(threadID);
}

async function handleJoin(api, threadID, senderID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || game.mode !== 'team' || !game.joinPhase) return false;
  const senderName = await getUserName(api, senderID);
  if (game.teamA.includes(senderID) || game.teamB.includes(senderID)) {
    await plain(api, threadID, t(threadID, 'join_already')); return false;
  }
  if (game.joinPhase === 'A') {
    if (game.teamSize === 'reglo' && game.teamA.length >= 5) {
      await plain(api, threadID, t(threadID, 'join_full', game.teamAName)); return false;
    }
    game.teamA.push(senderID);
    await plain(api, threadID, t(threadID, 'join_ok', senderName, game.teamAName));
    if (game.teamSize === 'reglo' && game.teamA.length === 5) {
      clearTimeout(game.joinTimeout);
      game.joinPhase = 'B';
      await plain(api, threadID, t(threadID, 'join_invite', game.teamBName, TIMEOUTS.JOIN / 1000));
      game.joinTimeout = setTimeout(() => finishTeamCreation(api, threadID), TIMEOUTS.JOIN);
    }
  } else {
    if (game.teamSize === 'reglo' && game.teamB.length >= 5) {
      await plain(api, threadID, t(threadID, 'join_full', game.teamBName)); return false;
    }
    game.teamB.push(senderID);
    await plain(api, threadID, t(threadID, 'join_ok', senderName, game.teamBName));
    if (game.teamSize === 'reglo' && game.teamB.length === 5) {
      clearTimeout(game.joinTimeout); game.joinTimeout = null; game.joinPhase = null;
      await startTeamQuiz(api, threadID);
    }
  }
  saveGameState(threadID).catch(() => {});
  return true;
}

async function finishTeamCreation(api, threadID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || !game.joinPhase) return;
  if (game.joinPhase === 'A') {
    game.joinPhase = 'B';
    await plain(api, threadID, t(threadID, 'join_timeout', game.teamAName, 'B'));
    await plain(api, threadID, t(threadID, 'join_invite', game.teamBName, TIMEOUTS.JOIN / 1000));
    game.joinTimeout = setTimeout(() => {
      const g = activeGames.get(threadID);
      if (g && g.active && g.joinPhase === 'B') { g.joinPhase = null; startTeamQuiz(api, threadID); }
    }, TIMEOUTS.JOIN);
  } else {
    game.joinPhase = null;
    await startTeamQuiz(api, threadID);
  }
}

async function startTeamQuiz(api, threadID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || game.mode !== 'team') return;
  if (!game.teamA.length || !game.teamB.length) {
    clearAllTimeouts(game); game.active = false; activeGames.delete(threadID);
    await plain(api, threadID, t(threadID, 'no_players')); return;
  }
  try { await sendImage(api, threadID, await drawStart('team', game.teamAName, game.teamBName)); } catch(e) {}
  await plain(api, threadID, t(threadID, 'start_team'));
  await api.sendMessage({ body: await buildTeamTable(api, threadID) }, threadID);
  await nextQuestion(api, threadID);
}

async function dispatchConfigInput(api, threadID, step, body) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || game.configLock) return;
  if (!body) return;

  if (step === 'category') {
    if (['1','2','3','4','5','6','7','8','9'].includes(body)) await runConfig(api, threadID, 'category', body);
    else await plain(api, threadID, t(threadID, 'cfg_hint_category'));
  } else if (step === 'customCategory') {
    await runConfig(api, threadID, 'customCategory', body);
  } else if (step === 'difficulty') {
    if (['1','2','3'].includes(body)) await runConfig(api, threadID, 'difficulty', body);
    else await plain(api, threadID, t(threadID, 'cfg_hint_difficulty'));
  } else if (step === 'total') {
    const n = parseInt(body, 10);
    if (!isNaN(n) && n >= 5 && n <= 50) await runConfig(api, threadID, 'total', body);
    else await plain(api, threadID, t(threadID, 'cfg_hint_total'));
  } else if (step === 'suggestions') {
    if (['1','2'].includes(body)) await runConfig(api, threadID, 'suggestions', body);
    else await plain(api, threadID, t(threadID, 'cfg_hint_choice'));
  } else if (step === 'teamAName') {
    await runConfig(api, threadID, 'teamAName', body);
  } else if (step === 'teamBName') {
    await runConfig(api, threadID, 'teamBName', body);
  } else if (step === 'teamSize') {
    if (['1','2'].includes(body)) await runConfig(api, threadID, 'teamSize', body);
    else await plain(api, threadID, t(threadID, 'cfg_hint_choice'));
  }
}

async function runConfig(api, threadID, step, value) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || game.configLock) return;
  game.configLock = true;

  try {
    clearAllTimeouts(game);
    unregReply(game.messageID);

    const proceed = async (msg, nextStep, schedKey, schedMs, schedDefault, schedValue) => {
      game.configStep = nextStep;
      const sent = await plain(api, threadID, msg);
      game.messageID = sent.messageID;
      regReply(sent.messageID, { type: 'quiz_config', threadID, step: nextStep, ownerID: game.ownerID });
      game.choiceTimeouts[schedKey] = setTimeout(async () => {
        const g = activeGames.get(threadID);
        if (!g?.active || g.configLock) return;
        unregReply(g.messageID);
        await plain(api, threadID, t(threadID, 'cfg_timeout_default', schedDefault)).catch(() => {});
        if (!activeGames.get(threadID)?.active) return;
        await runConfig(api, threadID, nextStep, schedValue);
      }, schedMs);
    };

    if (step === 'category') {
      const mapFr = { '1':'Culture generale','2':'Mangas et Anime','3':'Histoire','4':'Geographie','5':'Sciences','6':'Arts','7':'Sport','8':'Cinema' };
      const mapEn = { '1':'General Knowledge','2':'Manga and Anime','3':'History','4':'Geography','5':'Science','6':'Arts','7':'Sports','8':'Cinema' };
      const map = getLang(threadID) === 'en' ? mapEn : mapFr;
      if (value === '9') {
        await proceed(t(threadID, 'cfg_custom'), 'customCategory', 'cat', TIMEOUTS.CONFIG, t(threadID, 'default_cat'), t(threadID, 'default_cat'));
        return;
      }
      game.category = map[value] || t(threadID, 'default_cat');
      await proceed(t(threadID, 'cfg_diff', game.category), 'difficulty', 'diff', TIMEOUTS.CONFIG, 'Moyen', '2');

    } else if (step === 'customCategory') {
      game.category = sanitize(value).slice(0, 40) || t(threadID, 'default_cat');
      await proceed(t(threadID, 'cfg_diff', game.category), 'difficulty', 'diff', TIMEOUTS.CONFIG, 'Moyen', '2');

    } else if (step === 'difficulty') {
      const lang = getLang(threadID);
      const map = { '1': lang === 'en' ? 'easy':'facile', '2': lang === 'en' ? 'medium':'moyen', '3': lang === 'en' ? 'hard':'difficile' };
      game.difficulty = map[value] || t(threadID, 'default_diff');
      await proceed(t(threadID, 'cfg_total', game.difficulty), 'total', 'total', TIMEOUTS.CONFIG, '20 questions', '20');

    } else if (step === 'total') {
      const n = parseInt(value, 10);
      game.total = (!isNaN(n) && n >= 5 && n <= 50) ? n : 20;
      await proceed(t(threadID, 'cfg_sugg', game.total), 'suggestions', 'sugg', TIMEOUTS.CHOICE, 'Non — sans suggestions', '2');

    } else if (step === 'suggestions') {
      game.suggestions = (value === '1');
      game.configStep = null;
      game.messageID = null;
      if (game.mode === 'solo') {
        saveGameState(threadID).catch(() => {});
        try { await sendImage(api, threadID, await drawStart('solo', '', '')); } catch(e) {}
        await plain(api, threadID, t(threadID, 'start_solo'));
        await nextQuestion(api, threadID);
      } else {
        await proceed(t(threadID, 'cfg_teamA'), 'teamAName', 'nameA', TIMEOUTS.CONFIG, t(threadID, 'default_teamA'), t(threadID, 'default_teamA'));
      }

    } else if (step === 'teamAName') {
      game.teamAName = sanitize(value).slice(0, NAME_MAX_LEN) || t(threadID, 'default_teamA');
      await proceed(t(threadID, 'cfg_teamB', game.teamAName), 'teamBName', 'nameB', TIMEOUTS.CONFIG, t(threadID, 'default_teamB'), t(threadID, 'default_teamB'));

    } else if (step === 'teamBName') {
      game.teamBName = sanitize(value).slice(0, NAME_MAX_LEN) || t(threadID, 'default_teamB');
      await proceed(t(threadID, 'cfg_size', game.teamBName), 'teamSize', 'size', TIMEOUTS.CHOICE, 'Libre', '2');

    } else if (step === 'teamSize') {
      game.teamSize = (value === '1') ? 'reglo' : 'libre';
      game.configStep = null;
      game.messageID = null;
      game.joinPhase = 'A';
      await plain(api, threadID, t(threadID, 'cfg_teamA_go', game.teamAName, TIMEOUTS.JOIN / 1000));
      game.joinTimeout = setTimeout(() => finishTeamCreation(api, threadID), TIMEOUTS.JOIN);
      saveGameState(threadID).catch(() => {});
    }

  } finally {
    game.configLock = false;
  }
}

async function processAnswer(api, event, threadID, senderID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || game.questionLock) return;
  if (game.mode === 'team' && !game.teamA.includes(senderID) && !game.teamB.includes(senderID)) return;
  if (!game.attemptedThisQuestion) game.attemptedThisQuestion = new Set();
  if (game.attemptedThisQuestion.has(senderID)) return;
  game.attemptedThisQuestion.add(senderID);
  game.questionLock = true;

  if (game.timer) { clearTimeout(game.timer); game.timer = null; }
  unregReply(game.messageID);
  game.messageID = null;

  try {
    const senderName = await getUserName(api, senderID);
    const userAnswer = normalize(sanitize(event.body));
    let correct = false;

    if (game.suggestionsList) {
      const idx = ['a', 'b', 'c', 'd'].indexOf(userAnswer);
      if (idx !== -1 && game.suggestionsList[idx] !== undefined) {
        correct = normalize(game.suggestionsList[idx]) === game.answer;
      }
    } else {
      try {
        const res = await apiPost('/quiz/validate', {
          question: game.currentQuestion, expected: game.answer, userAnswer, threadId: threadID,
        });
        correct = !!res.data?.correct;
      } catch(_) { correct = userAnswer === game.answer; }
    }

    if (correct) {
      const pts = 10;
      game.scores[senderID] = (game.scores[senderID] || 0) + pts;
      game.sessionCorrect[senderID] = (game.sessionCorrect[senderID] || 0) + 1;
      if (game.mode === 'team') {
        if (game.teamA.includes(senderID)) game.teamAScore += pts;
        else if (game.teamB.includes(senderID)) game.teamBScore += pts;
      }
      apiPost('/user/update', { id: senderID, name: senderName, addPts: pts, addCoins: 5, streakChange: 1, loseChange: 0 }).catch(() => {});
      if (game.mode === 'team') {
        await api.sendMessage({ body: await buildTeamTable(api, threadID) }, threadID);
      } else {
        await plain(api, threadID, t(threadID, 'correct_solo_rank', senderName, pts, game.scores[senderID], getRank(game.scores[senderID])));
      }
      game.questionLock = false;
      await nextQuestion(api, threadID);

    } else {
      await api.setMessageReaction('❌', event.messageID, () => {}).catch(() => {});
      apiPost('/user/update', { id: senderID, name: senderName, addPts: 0, addCoins: 0, streakChange: 0, loseChange: 1 }).catch(() => {});
      const remaining = game.timerEnd - Date.now();
      if (remaining > 0) {
        const capturedAnswer = game.answer;
        game.timer = setTimeout(async () => {
          const g = activeGames.get(threadID);
          if (!g || !g.active || g.questionLock) return;
          g.questionLock = true;
          try { await plain(api, threadID, t(threadID, 'timeout', capturedAnswer)); } catch(e) {}
          g.questionLock = false;
          await nextQuestion(api, threadID);
        }, remaining);
        game.questionLock = false;
      } else {
        game.questionLock = false;
        await plain(api, threadID, t(threadID, 'timeout', game.answer)).catch(() => {});
        await nextQuestion(api, threadID);
      }
      saveGameState(threadID).catch(() => {});
    }
  } catch(err) {
    console.error('[processAnswer]', err.message);
    game.questionLock = false;
  }
}

module.exports = {
  config: { name: 'quiz', version: '2.6', author: "Octavio & L'Uchiha Perdu", role: 0, category: 'game' },

  onStart: async function({ api, event, args }) {
    await fetchBotName(api);
    const threadID = event.threadID;
    const senderID = event.senderID;
    const cmd = (args[0] || '').toLowerCase();

    if (cmd === 'stop') {
      const game = activeGames.get(threadID);
      if (!game || !game.active) return plain(api, threadID, t(threadID, 'none_running'));
      if (game.ownerID && game.ownerID !== senderID) return plain(api, threadID, t(threadID, 'not_owner'));
      return stopGame(threadID, api);
    }

    if (cmd === 'changelang') {
      const lang = (args[1] || '').toLowerCase();
      if (lang !== 'fr' && lang !== 'en') return plain(api, threadID, t(threadID, 'lang_bad'));
      langSettings.set(threadID, lang);
      return plain(api, threadID, t(threadID, 'lang_changed'));
    }

    if (cmd === 'classement' || cmd === 'leaderboard') {
      try {
        const res = await apiGet('/leaderboard?limit=10');
        let msg = t(threadID, 'rank_title') + '\n\n';
        res.data.forEach((u, i) => { msg += t(threadID, 'rank_line', i + 1, u.name, u.pts) + '\n'; });
        return announce(api, threadID, msg.trim());
      } catch(_) { return plain(api, threadID, t(threadID, 'rank_err')); }
    }

    if (cmd === 'profil' || cmd === 'profile') {
      try {
        const senderName = await getUserName(api, senderID);
        const res = await apiGet(`/user/${senderID}`);
        const u = res.data;
        return announce(api, threadID, `${t(threadID, 'profile_header', senderName, getRank(u.pts || 0))}\n\n${t(threadID, 'profile_stats', u.pts || 0, u.streak || 0, u.bestStreak || 0)}`);
      } catch(_) { return plain(api, threadID, t(threadID, 'rank_err')); }
    }

    if (cmd === 'regle' || cmd === 'rules') return announce(api, threadID, t(threadID, 'rules'));
    if (cmd === 'credits') return plain(api, threadID, t(threadID, 'credits'));

    if (cmd === 'start') {
      const existing = activeGames.get(threadID);
      if (existing && existing.active) return plain(api, threadID, t(threadID, 'already_running'));
      const sub = (args[1] || '').toLowerCase();
      if (sub !== 'solo' && sub !== 'team') return plain(api, threadID, t(threadID, 'bad_start_cmd'));

      const game = makeGame();
      game.active = true;
      game.mode = sub;
      game.ownerID = senderID;
      game.configStep = 'category';
      activeGames.set(threadID, game);

      const sent = await plain(api, threadID, t(threadID, 'cfg_cat'));
      game.messageID = sent.messageID;
      regReply(sent.messageID, { type: 'quiz_config', threadID, step: 'category', ownerID: senderID });

      game.choiceTimeouts.cat = setTimeout(async () => {
        const g = activeGames.get(threadID);
        if (!g?.active || g.configLock) return;
        unregReply(g.messageID);
        await plain(api, threadID, t(threadID, 'cfg_timeout_default', t(threadID, 'default_cat'))).catch(() => {});
        if (!activeGames.get(threadID)?.active) return;
        await runConfig(api, threadID, 'category', '1');
      }, TIMEOUTS.CONFIG);

      saveGameState(threadID).catch(() => {});
      return;
    }

    if (cmd === 'join') {
      const game = activeGames.get(threadID);
      if (!game || !game.active || game.mode !== 'team') return plain(api, threadID, t(threadID, 'none_running'));
      if (game.joinPhase !== 'A' && game.joinPhase !== 'B') return plain(api, threadID, t(threadID, 'join_closed'));
      return handleJoin(api, threadID, senderID);
    }

    return announce(api, threadID, t(threadID, 'cmd_list'));
  },

  onReply: async function({ api, event, Reply }) {
    if (!Reply) return;
    const { type, threadID } = Reply;
    const game = activeGames.get(threadID);
    if (!game || !game.active) return;

    if (type === 'quiz_answer') {
      await processAnswer(api, event, threadID, event.senderID);
      return;
    }

    if (type === 'quiz_config') {
      const { step, ownerID } = Reply;
      if (event.senderID !== ownerID) return;
      if (game.configStep !== step) return;
      const body = (event.body || '').trim();
      await dispatchConfigInput(api, threadID, step, body);
      return;
    }
  },

  handleEvent: async function({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const game = activeGames.get(threadID);
    if (!game || !game.active) return;
    const body = (event.body || '').trim();
    if (!body) return;

    if (game.configStep && senderID === game.ownerID && !game.configLock) {
      await dispatchConfigInput(api, threadID, game.configStep, body);
      return;
    }

    if (body.toLowerCase() === 'join' && game.mode === 'team' && (game.joinPhase === 'A' || game.joinPhase === 'B')) {
      await handleJoin(api, threadID, senderID);
    }
  },
};
