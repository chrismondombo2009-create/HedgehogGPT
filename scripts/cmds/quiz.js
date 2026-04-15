const axios = require('axios');
const { createCanvas } = require('canvas');

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
    solo_win: (name, pts) => `Gagnant : ${name}  —  ${pts} pts`,
    no_score: 'Aucun point marque.',
    join_already: 'Vous etes deja dans une equipe.',
    join_full: (name) => `L\'equipe ${name} est deja complete.`,
    join_ok: (name, team) => `${name} a rejoint ${team}.`,
    join_timeout: (a, b) => `Temps de recrutement ecoule pour ${a}. Passage a la phase ${b}.`,
    join_invite: (team, s) => `Equipe ${team} — tapez "join" pour vous inscrire  (${s}s)`,
    join_closed: 'La phase de recrutement est terminee.',
    no_players: 'Aucun joueur inscrit. Quiz annule.',
    cfg_cat: 'Choisissez une categorie en tapant le numero correspondant (40 secondes) :\n\n1. Culture generale\n2. Mangas et Anime\n3. Histoire\n4. Geographie\n5. Sciences\n6. Arts\n7. Sport\n8. Cinema\n9. Autre — tapez le nom de votre choix',
    cfg_diff: (cat) => `Categorie retenue : ${cat}\n\nChoisissez la difficulte en tapant le numero (40 secondes) :\n\n1. Facile\n2. Moyen\n3. Difficile`,
    cfg_total: (diff) => `Difficulte retenue : ${diff}\n\nCombien de questions ? Tapez un nombre entre 5 et 50 (defaut 20, 40 secondes)`,
    cfg_sugg: (n) => `Nombre de questions retenu : ${n}\n\nVoulez-vous des suggestions de reponse A B C D ?\nTapez 1 pour Oui, tapez 2 pour Non  (40 secondes)`,
    cfg_teamA: 'Quel sera le nom de l\'Equipe A ? Tapez le nom (40 secondes)',
    cfg_teamB: (a) => `Equipe A : ${a}\n\nQuel sera le nom de l\'Equipe B ? Tapez le nom (40 secondes)`,
    cfg_size: (b) => `Equipe B : ${b}\n\nChoisissez le format d\'equipe (40 secondes) :\n\n1. Limite — 5 joueurs maximum par equipe\n2. Libre — aucune limite`,
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
    cmd_list: 'COMMANDES DISPONIBLES\n\nquiz start solo        — Demarrer un quiz en mode solo\nquiz start team        — Demarrer un quiz en equipe\nquiz stop              — Arreter le quiz en cours\nquiz classement        — Afficher le top 10 des joueurs\nquiz profil            — Afficher votre profil et vos statistiques\nquiz regle             — Afficher les regles du jeu\nquiz credits           — Afficher les credits\nquiz changelang fr     — Passer la langue en francais\nquiz changelang en     — Switch language to English',
    lang_bad: 'Usage : quiz changelang fr  pour le francais  |  quiz changelang en  pour l\'anglais',
    not_owner: 'Seul le createur du quiz peut l\'arreter.',
    cfg_timeout_default: (what) => `Temps ecoule — aucune reponse recue. Valeur par defaut appliquee : ${what}`,
    cfg_hint_choice: 'Repondez uniquement avec 1 ou 2.',
    cfg_hint_total: 'Entrez un nombre entier compris entre 5 et 50.',
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
    solo_win: (name, pts) => `Winner: ${name}  —  ${pts} pts`,
    no_score: 'No points scored.',
    join_already: 'You are already in a team.',
    join_full: (name) => `Team ${name} is already full.`,
    join_ok: (name, team) => `${name} joined ${team}.`,
    join_timeout: (a, b) => `Recruitment time expired for ${a}. Moving to phase ${b}.`,
    join_invite: (team, s) => `Team ${team} — type "join" to register  (${s}s)`,
    join_closed: 'The recruitment phase is over.',
    no_players: 'No players registered. Quiz cancelled.',
    cfg_cat: 'Choose a category by typing the corresponding number (40 seconds):\n\n1. General Knowledge\n2. Manga and Anime\n3. History\n4. Geography\n5. Science\n6. Arts\n7. Sports\n8. Cinema\n9. Custom — type your own category name',
    cfg_diff: (cat) => `Category selected: ${cat}\n\nChoose the difficulty by typing the number (40 seconds):\n\n1. Easy\n2. Medium\n3. Hard`,
    cfg_total: (diff) => `Difficulty selected: ${diff}\n\nHow many questions? Type a number between 5 and 50 (default 20, 40 seconds)`,
    cfg_sugg: (n) => `Number of questions: ${n}\n\nDo you want answer suggestions A B C D?\nType 1 for Yes, type 2 for No  (40 seconds)`,
    cfg_teamA: 'What will be the name of Team A? Type the name (40 seconds)',
    cfg_teamB: (a) => `Team A: ${a}\n\nWhat will be the name of Team B? Type the name (40 seconds)`,
    cfg_size: (b) => `Team B: ${b}\n\nChoose the team format (40 seconds):\n\n1. Limited — maximum 5 players per team\n2. Open — no limit`,
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
    rank_err: 'Unable to load the leaderboard right now.',
    profile_header: (name, rank) => `${name}\nRank: ${rank}`,
    profile_stats: (pts, streak, best) => `Points: ${pts}\nCurrent streak: ${streak}\nBest streak: ${best}`,
    error_api: 'Connection error. The quiz has been stopped.',
    lang_changed: 'Language changed: English',
    rules: 'RULES\n\nSolo: reply to questions directly\nTeam: join a team by typing "join"\nWith suggestions: reply with the letter A, B, C or D\nWithout suggestions: reply freely\n\n10 points per correct answer\n20 second timer per question',
    credits: 'Quiz Bot\nDesigned by Octavio\nMaintained by L\'Uchiha Perdu',
    cmd_list: 'AVAILABLE COMMANDS\n\nquiz start solo        — Start a solo quiz\nquiz start team        — Start a team quiz\nquiz stop              — Stop the current quiz\nquiz leaderboard       — Show the top 10 players\nquiz profile           — Show your profile and stats\nquiz rules             — Show the rules\nquiz credits           — Show credits\nquiz changelang fr     — Passer la langue en francais\nquiz changelang en     — Switch language to English',
    lang_bad: 'Usage: quiz changelang fr  for French  |  quiz changelang en  for English',
    not_owner: 'Only the quiz creator can stop it.',
    cfg_timeout_default: (what) => `Time expired — no answer received. Default applied: ${what}`,
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

function getLang(tid) {
  return langSettings.get(tid) || 'fr';
}

function t(tid, key, ...args) {
  const lang = getLang(tid);
  const val = (I18N[lang] ?? I18N.fr)[key] ?? I18N.fr[key];
  if (val === undefined) {
    console.warn(`[i18n] Missing key: ${key} (lang: ${lang})`);
    return key;
  }
  return typeof val === 'function' ? val(...args) : val;
}

function getRank(pts) {
  for (const [threshold, label] of RANKS) if (pts >= threshold) return label;
  return RANKS[RANKS.length - 1][1];
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
  } catch (err) {
    console.error('[fetchBotName]', err.message);
    botNameFetched = false;
  }
}

async function getUserName(api, id) {
  const cached = nameCache.get(id);
  if (cached && Date.now() - cached.ts < NAME_CACHE_TTL) return cached.name;
  try {
    const info = await api.getUserInfo(id);
    const name = sanitize(info[id]?.name || 'Joueur');
    nameCache.set(id, { name, ts: Date.now() });
    return name;
  } catch (err) {
    console.error('[getUserName]', id, err.message);
    return 'Inconnu';
  }
}

function getGame(threadID) {
  if (!activeGames.has(threadID)) {
    activeGames.set(threadID, {
      active: false,
      mode: null,
      category: null,
      difficulty: null,
      total: 20,
      suggestions: false,
      teamSize: 'libre',
      teamAName: null,
      teamBName: null,
      teamA: [],
      teamB: [],
      teamAScore: 0,
      teamBScore: 0,
      scores: {},
      sessionCorrect: {},
      currentQuestion: null,
      answer: null,
      suggestionsList: null,
      messageID: null,
      timer: null,
      timerEnd: 0,
      index: 0,
      state: 'idle',
      configStep: null,
      joinPhase: null,
      joinTimeout: null,
      questionLock: false,
      ownerID: null,
      choiceTimeouts: {},
      attemptedThisQuestion: new Set(),
    });
  }
  return activeGames.get(threadID);
}

async function apiPost(path, data) {
  const timeout = path.includes('/quiz/question') ? API_TIMEOUT.question : API_TIMEOUT.default;
  return axios.post(`${API_BASE}${path}`, data, { headers: API_HEADERS, timeout });
}

async function apiGet(path) {
  return axios.get(`${API_BASE}${path}`, { headers: API_HEADERS, timeout: API_TIMEOUT.default });
}

async function apiDelete(path) {
  return axios.delete(`${API_BASE}${path}`, { headers: API_HEADERS, timeout: API_TIMEOUT.default });
}

async function saveGameState(threadID) {
  const g = activeGames.get(threadID);
  if (!g) return;
  try {
    await apiPost('/game/save', {
      threadId: threadID,
      gameState: {
        active: g.active,
        mode: g.mode,
        category: g.category,
        difficulty: g.difficulty,
        total: g.total,
        suggestions: g.suggestions,
        teamSize: g.teamSize,
        teamAName: g.teamAName,
        teamBName: g.teamBName,
        teamA: g.teamA,
        teamB: g.teamB,
        teamAScore: g.teamAScore,
        teamBScore: g.teamBScore,
        scores: g.scores,
        sessionCorrect: g.sessionCorrect,
        currentQuestion: g.currentQuestion,
        answer: g.answer,
        suggestionsList: g.suggestionsList,
        messageID: g.messageID,
        timerEnd: g.timerEnd,
        index: g.index,
        state: g.state,
        ownerID: g.ownerID,
        attemptedThisQuestion: [...g.attemptedThisQuestion],
      },
    });
  } catch (err) {
    console.error('[saveGameState]', err.message);
  }
}

function announce(api, threadID, text) {
  const body = `—————«•»—————\n${text}\n—————«•»—————`;
  return api.sendMessage({ body }, threadID);
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

async function stopGame(threadID, api, silent = false) {
  const game = activeGames.get(threadID);
  if (!game || !game.active) return;
  clearAllTimeouts(game);
  game.active = false;
  game.state = 'idle';
  game.configStep = null;
  game.joinPhase = null;
  game.questionLock = false;
  game.attemptedThisQuestion = new Set();
  await apiDelete(`/game/stop/${threadID}`).catch(() => {});
  if (!silent) await plain(api, threadID, t(threadID, 'stopped'));
  activeGames.delete(threadID);
}

function wrapText(ctx, text, maxWidth) {
  const paragraphs = String(text).split('\n');
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

async function drawQuestion(question, index, total) {
  const measureCanvas = createCanvas(800, 100);
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = '22px Arial';
  const lines = wrapText(measureCtx, sanitize(question), 740);
  const neededHeight = Math.max(300, 130 + lines.length * 38 + 30);
  const canvas = createCanvas(800, neededHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 800, neededHeight);
  ctx.fillStyle = '#c0392b';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`${index} / ${total}`, 30, 44);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 54);
  ctx.lineTo(770, 54);
  ctx.stroke();
  ctx.fillStyle = '#ecf0f1';
  ctx.font = '22px Arial';

  let y = 100;
  for (const line of lines) {
    ctx.fillText(line, 30, y);
    y += 38;
  }

  return canvas.toBuffer();
}

async function drawVictory(winner, ws, loser, ls, victoryTitle) {
  const canvas = createCanvas(800, 380);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f3460';
  ctx.fillRect(0, 0, 800, 380);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 780, 360);

  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 36px Arial';
  const titleText = sanitize(victoryTitle || 'VICTOIRE').slice(0, 30);
  ctx.fillText(titleText, (800 - ctx.measureText(titleText).width) / 2, 80);

  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 28px Arial';
  const winnerText = sanitize(winner).slice(0, 30);
  ctx.fillText(winnerText, (800 - ctx.measureText(winnerText).width) / 2, 160);

  ctx.fillStyle = '#ecf0f1';
  ctx.font = '24px Arial';
  const scoreText = `${ws} pts`;
  ctx.fillText(scoreText, (800 - ctx.measureText(scoreText).width) / 2, 210);

  ctx.fillStyle = '#7f8c8d';
  ctx.font = '18px Arial';
  const loserText = `${sanitize(loser).slice(0, 30)} : ${ls} pts`;
  ctx.fillText(loserText, (800 - ctx.measureText(loserText).width) / 2, 290);

  return canvas.toBuffer();
}

async function drawStart(mode, teamAName, teamBName) {
  const canvas = createCanvas(800, 360);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, 800, 360);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 780, 340);
  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('QUIZ', 360, 70);
  if (mode === 'team') {
    ctx.font = '24px Arial';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(sanitize(teamAName).slice(0, 30), 300, 170);
    ctx.fillStyle = '#3498db';
    ctx.fillText(sanitize(teamBName).slice(0, 30), 300, 250);
  } else {
    ctx.fillStyle = '#bdc3c7';
    ctx.font = '24px Arial';
    ctx.fillText('Solo', 380, 190);
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
    `${game.teamAName}  [ ${game.teamAScore} pts ]`,
    ...linesA,
    '',
    `${game.teamBName}  [ ${game.teamBScore} pts ]`,
    ...linesB,
    '',
    `━━━━━━━━━━━━━━━━━━`,
    `${heure}  |  ${botName}`,
  ].join('\n');
}

async function nextQuestion(api, threadID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active || game.questionLock) return;
  game.questionLock = true;
  try {
    if (game.timer) { clearTimeout(game.timer); game.timer = null; }
    if (game.index >= game.total) {
      game.questionLock = false;
      await endGame(api, threadID);
      return;
    }
    game.index++;
    game.attemptedThisQuestion = new Set();

    const mode = game.suggestions ? 'suggestions' : 'free';
    const res = await apiPost('/quiz/question', {
      mode,
      category: game.category,
      difficulty: game.difficulty,
      threadId: threadID,
    });
    const q = res.data;
    if (!q?.question || !q?.answer) throw new Error('Invalid question from API');

    game.currentQuestion = sanitize(q.question);
    game.answer = sanitize(q.answer).toLowerCase().trim();
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
    game.messageID = sent.messageID;

    const img = await drawQuestion(game.currentQuestion, game.index, game.total);
    await api.sendMessage({ attachment: img }, threadID);

    game.timerEnd = Date.now() + TIMEOUTS.QUESTION;
    game.questionLock = false;

    game.timer = setTimeout(async () => {
      const g = activeGames.get(threadID);
      if (!g || !g.active || g.messageID !== game.messageID || g.questionLock) return;
      g.questionLock = true;
      try {
        await plain(api, threadID, t(threadID, 'timeout', g.answer));
      } finally {
        g.questionLock = false;
      }
      await nextQuestion(api, threadID);
    }, TIMEOUTS.QUESTION);

    if (activeGames.has(threadID)) await saveGameState(threadID);
  } catch (err) {
    console.error('[nextQuestion]', err.message);
    game.questionLock = false;
    if (activeGames.has(threadID)) {
      await plain(api, threadID, t(threadID, 'error_api'));
      await stopGame(threadID, api, true);
    }
  }
}

async function endGame(api, threadID) {
  const game = activeGames.get(threadID);
  if (!game || !game.active) return;
  clearAllTimeouts(game);
  game.active = false;
  game.state = 'idle';

  let summary = `${t(threadID, 'end_title')}\n\n`;
  let winner = '';
  let ws = 0;
  let loser = '';
  let ls = 0;

  if (game.mode === 'team') {
    summary += `${game.teamAName} : ${game.teamAScore} pts\n${game.teamBName} : ${game.teamBScore} pts\n\n`;
    if (game.teamAScore > game.teamBScore) {
      summary += t(threadID, 'team_win', game.teamAName);
      winner = game.teamAName; ws = game.teamAScore;
      loser = game.teamBName; ls = game.teamBScore;
    } else if (game.teamBScore > game.teamAScore) {
      summary += t(threadID, 'team_win', game.teamBName);
      winner = game.teamBName; ws = game.teamBScore;
      loser = game.teamAName; ls = game.teamAScore;
    } else {
      summary += t(threadID, 'team_draw');
    }
  } else {
    const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length) {
      const [wid, wpts] = sorted[0];
      const wname = await getUserName(api, wid);
      const rank = getRank(wpts);
      summary += t(threadID, 'solo_win_rank', wname, wpts, rank);
      winner = wname; ws = wpts;
      if (sorted.length > 1) {
        loser = await getUserName(api, sorted[1][0]);
        ls = sorted[1][1];
      }
    } else {
      summary += t(threadID, 'no_score');
    }
  }

  await announce(api, threadID, summary);
  if (winner && loser) {
    const img = await drawVictory(winner, ws, loser, ls, t(threadID, 'victory_title'));
    await api.sendMessage({ attachment: img }, threadID);
  }
  await apiDelete(`/game/stop/${threadID}`).catch(() => {});
  activeGames.delete(threadID);
}

async function handleJoin(api, threadID, senderID) {
  const game = activeGames.get(threadID);
  if (!game) return false;
  const senderName = await getUserName(api, senderID);
  if (!game.active || game.mode !== 'team' || !game.joinPhase) return false;
  if (game.teamA.includes(senderID) || game.teamB.includes(senderID)) {
    await plain(api, threadID, t(threadID, 'join_already'));
    return false;
  }
  if (game.joinPhase === 'A') {
    if (game.teamSize === 'reglo' && game.teamA.length >= 5) {
      await plain(api, threadID, t(threadID, 'join_full', game.teamAName));
      return false;
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
      await plain(api, threadID, t(threadID, 'join_full', game.teamBName));
      return false;
    }
    game.teamB.push(senderID);
    await plain(api, threadID, t(threadID, 'join_ok', senderName, game.teamBName));
    if (game.teamSize === 'reglo' && game.teamB.length === 5) {
      clearTimeout(game.joinTimeout);
      game.joinTimeout = null;
      game.joinPhase = null;
      await startTeamQuiz(api, threadID);
    }
  }
  await saveGameState(threadID);
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
      if (g && g.active && g.joinPhase === 'B') {
        g.joinPhase = null;
        startTeamQuiz(api, threadID);
      }
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
    clearAllTimeouts(game);
    game.active = false;
    activeGames.delete(threadID);
    await plain(api, threadID, t(threadID, 'no_players'));
    return;
  }
  const img = await drawStart('team', game.teamAName, game.teamBName);
  await api.sendMessage({ attachment: img }, threadID);
  await plain(api, threadID, t(threadID, 'start_team'));
  const table = await buildTeamTable(api, threadID);
  await api.sendMessage({ body: table }, threadID);
  await nextQuestion(api, threadID);
}

async function handleAnswer(api, event, threadID, senderID) {
  const game = activeGames.get(threadID);
  if (!game) return;
  const isReplyMatch = event.messageReply?.messageID === game.messageID;
  if (!game.active || !isReplyMatch || game.questionLock) return;

  if (game.mode === 'team') {
    const inTeam = game.teamA.includes(senderID) || game.teamB.includes(senderID);
    if (!inTeam) return;
  }

  if (!game.attemptedThisQuestion) game.attemptedThisQuestion = new Set();
  if (game.attemptedThisQuestion.has(senderID)) return;

  game.attemptedThisQuestion.add(senderID);
  game.questionLock = true;

  try {
    if (game.timer) { clearTimeout(game.timer); game.timer = null; }
    const senderName = await getUserName(api, senderID);
    const userAnswer = sanitize(event.body).toLowerCase();
    let correct = false;

    if (game.suggestionsList) {
      const idx = ['a', 'b', 'c', 'd'].indexOf(userAnswer);
      if (idx !== -1 && game.suggestionsList[idx] !== undefined) {
        correct = game.suggestionsList[idx].toLowerCase().trim() === game.answer;
      }
    } else {
      try {
        const res = await apiPost('/quiz/validate', {
          question: game.currentQuestion,
          expected: game.answer,
          userAnswer,
          threadId: threadID,
        });
        correct = !!res.data?.correct;
      } catch (_) {
        correct = userAnswer.trim() === game.answer.trim();
      }
    }

    if (correct) {
      const pts = 10;
      game.scores[senderID] = (game.scores[senderID] || 0) + pts;
      game.sessionCorrect[senderID] = (game.sessionCorrect[senderID] || 0) + 1;

      if (game.mode === 'team') {
        if (game.teamA.includes(senderID)) game.teamAScore += pts;
        else if (game.teamB.includes(senderID)) game.teamBScore += pts;
      }

      await apiPost('/user/update', {
        id: senderID,
        name: senderName,
        addPts: pts,
        addCoins: 5,
        streakChange: 1,
        loseChange: 0,
      }).catch(() => {});

      if (game.mode === 'team') {
        const table = await buildTeamTable(api, threadID);
        await api.sendMessage({ body: table }, threadID);
      } else {
        const newTotal = game.scores[senderID];
        const rank = getRank(newTotal);
        await plain(api, threadID, t(threadID, 'correct_solo_rank', senderName, pts, newTotal, rank));
      }

      game.questionLock = false;
      await nextQuestion(api, threadID);
    } else {
      await api.setMessageReaction('❌', event.messageID, () => {});
      await apiPost('/user/update', {
        id: senderID,
        name: senderName,
        addPts: 0,
        addCoins: 0,
        streakChange: 0,
        loseChange: 1,
      }).catch(() => {});

      const remaining = game.timerEnd - Date.now();
      if (remaining > 0) {
        game.timer = setTimeout(async () => {
          const g = activeGames.get(threadID);
          if (!g || !g.active || g.messageID !== game.messageID || g.questionLock) return;
          g.questionLock = true;
          try {
            await plain(api, threadID, t(threadID, 'timeout', g.answer));
          } finally {
            g.questionLock = false;
          }
          await nextQuestion(api, threadID);
        }, remaining);
        game.questionLock = false;
      } else {
        game.questionLock = false;
        await plain(api, threadID, t(threadID, 'timeout', game.answer));
        await nextQuestion(api, threadID);
      }
      await saveGameState(threadID);
    }
  } catch (err) {
    console.error('[handleAnswer]', err.message);
    game.questionLock = false;
  }
}

async function runConfig(api, threadID, step, value) {
  const game = activeGames.get(threadID);
  if (!game) return;
  clearAllTimeouts(game);

  const sched = (key, ms, notifMsg, fn) => {
    game.choiceTimeouts[key] = setTimeout(async () => {
      if (!activeGames.get(threadID)?.active) return;
      await plain(api, threadID, notifMsg).catch(() => {});
      await fn();
    }, ms);
  };

  if (step === 'category') {
    const mapFr = { '1': 'Culture generale', '2': 'Mangas et Anime', '3': 'Histoire', '4': 'Geographie', '5': 'Sciences', '6': 'Arts', '7': 'Sport', '8': 'Cinema' };
    const mapEn = { '1': 'General Knowledge', '2': 'Manga and Anime', '3': 'History', '4': 'Geography', '5': 'Science', '6': 'Arts', '7': 'Sports', '8': 'Cinema' };
    const map = getLang(threadID) === 'en' ? mapEn : mapFr;
    if (value === '9') {
      game.configStep = 'customCategory';
      await plain(api, threadID, t(threadID, 'cfg_custom'));
      sched('cat', TIMEOUTS.CONFIG, t(threadID, 'cfg_timeout_default', t(threadID, 'default_cat')), () => runConfig(api, threadID, 'customCategory', t(threadID, 'default_cat')));
      return;
    }
    game.category = map[value] || t(threadID, 'default_cat');
    game.configStep = 'difficulty';
    await plain(api, threadID, t(threadID, 'cfg_diff', game.category));
    sched('diff', TIMEOUTS.CONFIG, t(threadID, 'cfg_timeout_default', 'Moyen'), () => runConfig(api, threadID, 'difficulty', '2'));
  } else if (step === 'customCategory') {
    game.category = sanitize(value).slice(0, 40) || t(threadID, 'default_cat');
    game.configStep = 'difficulty';
    await plain(api, threadID, t(threadID, 'cfg_diff', game.category));
    sched('diff', TIMEOUTS.CONFIG, t(threadID, 'cfg_timeout_default', 'Moyen'), () => runConfig(api, threadID, 'difficulty', '2'));
  } else if (step === 'difficulty') {
    const lang = getLang(threadID);
    const map = { '1': lang === 'en' ? 'easy' : 'facile', '2': lang === 'en' ? 'medium' : 'moyen', '3': lang === 'en' ? 'hard' : 'difficile' };
    game.difficulty = map[value] || t(threadID, 'default_diff');
    game.configStep = 'total';
    await plain(api, threadID, t(threadID, 'cfg_total', game.difficulty));
    sched('total', TIMEOUTS.CONFIG, t(threadID, 'cfg_timeout_default', '20 questions'), () => runConfig(api, threadID, 'total', '20'));
  } else if (step === 'total') {
    const n = parseInt(value, 10);
    game.total = (!isNaN(n) && n >= 5 && n <= 50) ? n : 20;
    game.configStep = 'suggestions';
    await plain(api, threadID, t(threadID, 'cfg_sugg', game.total));
    sched('sugg', TIMEOUTS.CHOICE, t(threadID, 'cfg_timeout_default', 'Non — sans suggestions'), () => runConfig(api, threadID, 'suggestions', '2'));
  } else if (step === 'suggestions') {
    game.suggestions = (value === '1');
    if (game.mode === 'solo') {
      game.configStep = null;
      await saveGameState(threadID);
      const img = await drawStart('solo', '', '');
      await api.sendMessage({ attachment: img }, threadID);
      await plain(api, threadID, t(threadID, 'start_solo'));
      await nextQuestion(api, threadID);
    } else {
      game.configStep = 'teamAName';
      await plain(api, threadID, t(threadID, 'cfg_teamA'));
      sched('nameA', TIMEOUTS.CONFIG, t(threadID, 'cfg_timeout_default', t(threadID, 'default_teamA')), () => runConfig(api, threadID, 'teamAName', t(threadID, 'default_teamA')));
    }
  } else if (step === 'teamAName') {
    game.teamAName = sanitize(value).slice(0, NAME_MAX_LEN) || t(threadID, 'default_teamA');
    game.configStep = 'teamBName';
    await plain(api, threadID, t(threadID, 'cfg_teamB', game.teamAName));
    sched('nameB', TIMEOUTS.CONFIG, t(threadID, 'cfg_timeout_default', t(threadID, 'default_teamB')), () => runConfig(api, threadID, 'teamBName', t(threadID, 'default_teamB')));
  } else if (step === 'teamBName') {
    game.teamBName = sanitize(value).slice(0, NAME_MAX_LEN) || t(threadID, 'default_teamB');
    game.configStep = 'teamSize';
    await plain(api, threadID, t(threadID, 'cfg_size', game.teamBName));
    sched('size', TIMEOUTS.CHOICE, t(threadID, 'cfg_timeout_default', 'Libre'), () => runConfig(api, threadID, 'teamSize', '2'));
  } else if (step === 'teamSize') {
    game.teamSize = (value === '1') ? 'reglo' : 'libre';
    game.configStep = null;
    game.joinPhase = 'A';
    await plain(api, threadID, t(threadID, 'cfg_teamA_go', game.teamAName, TIMEOUTS.JOIN / 1000));
    game.joinTimeout = setTimeout(() => finishTeamCreation(api, threadID), TIMEOUTS.JOIN);
    await saveGameState(threadID);
  }
}

module.exports = {
  config: { name: 'quiz', version: '2.1', author: 'Octavio & L\'Uchiha Perdu', role: 0, category: 'game' },

  onStart: async function({ api, event, args }) {
    await fetchBotName(api);
    const threadID = event.threadID;
    const senderID = event.senderID;
    const cmd = args[0]?.toLowerCase();
    const game = getGame(threadID);

    if (cmd === 'stop') {
      if (!game.active) return plain(api, threadID, t(threadID, 'none_running'));
      if (game.ownerID && game.ownerID !== senderID) return plain(api, threadID, t(threadID, 'not_owner'));
      return stopGame(threadID, api);
    }

    if (cmd === 'changelang') {
      const lang = args[1]?.toLowerCase();
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
      } catch (_) {
        return plain(api, threadID, t(threadID, 'rank_err'));
      }
    }

    if (cmd === 'profil' || cmd === 'profile') {
      try {
        const senderName = await getUserName(api, senderID);
        const res = await apiGet(`/user/${senderID}`);
        const u = res.data;
        const rank = getRank(u.pts || 0);
        const header = t(threadID, 'profile_header', senderName, rank);
        const stats = t(threadID, 'profile_stats', u.pts || 0, u.streak || 0, u.bestStreak || 0);
        return announce(api, threadID, `${header}\n\n${stats}`);
      } catch (_) {
        return plain(api, threadID, t(threadID, 'rank_err'));
      }
    }

    if (cmd === 'regle' || cmd === 'rules') {
      return announce(api, threadID, t(threadID, 'rules'));
    }

    if (cmd === 'credits') {
      return plain(api, threadID, t(threadID, 'credits'));
    }

    if (cmd === 'start') {
      if (game.active) return plain(api, threadID, t(threadID, 'already_running'));
      const sub = args[1]?.toLowerCase();
      if (sub !== 'solo' && sub !== 'team') return plain(api, threadID, t(threadID, 'bad_start_cmd'));
      game.active = true;
      game.mode = sub;
      game.ownerID = senderID;
      game.state = 'config';
      game.configStep = 'category';
      await plain(api, threadID, t(threadID, 'cfg_cat'));
      game.choiceTimeouts.cat = setTimeout(async () => {
        if (!activeGames.get(threadID)?.active) return;
        await plain(api, threadID, t(threadID, 'cfg_timeout_default', t(threadID, 'default_cat'))).catch(() => {});
        await runConfig(api, threadID, 'category', '1');
      }, TIMEOUTS.CONFIG);
      await saveGameState(threadID);
      return;
    }

    if (cmd === 'join') {
      if (!game.active || game.mode !== 'team') return plain(api, threadID, t(threadID, 'none_running'));
      if (game.joinPhase !== 'A' && game.joinPhase !== 'B') return plain(api, threadID, t(threadID, 'join_closed'));
      return handleJoin(api, threadID, senderID);
    }

    return announce(api, threadID, t(threadID, 'cmd_list'));
  },

  handleEvent: async function({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const game = activeGames.get(threadID);
    if (!game || !game.active) return;
    const body = event.body?.trim() || '';

    if (game.configStep && game.ownerID === senderID) {
      const step = game.configStep;

      if (step === 'category') {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(body)) {
          clearTimeout(game.choiceTimeouts.cat);
          await runConfig(api, threadID, 'category', body);
        } else if (body) {
          await plain(api, threadID, t(threadID, 'cfg_hint_category'));
        }
        return;
      }

      if (step === 'customCategory') {
        if (body) {
          clearTimeout(game.choiceTimeouts.cat);
          await runConfig(api, threadID, 'customCategory', body);
        }
        return;
      }

      if (step === 'difficulty') {
        if (['1', '2', '3'].includes(body)) {
          clearTimeout(game.choiceTimeouts.diff);
          await runConfig(api, threadID, 'difficulty', body);
        } else if (body) {
          await plain(api, threadID, t(threadID, 'cfg_hint_difficulty'));
        }
        return;
      }

      if (step === 'total') {
        const n = parseInt(body, 10);
        if (!isNaN(n) && n >= 5 && n <= 50) {
          clearTimeout(game.choiceTimeouts.total);
          await runConfig(api, threadID, 'total', body);
        } else if (body) {
          await plain(api, threadID, t(threadID, 'cfg_hint_total'));
        }
        return;
      }

      if (step === 'suggestions') {
        if (['1', '2'].includes(body)) {
          clearTimeout(game.choiceTimeouts.sugg);
          await runConfig(api, threadID, 'suggestions', body);
        } else if (body) {
          await plain(api, threadID, t(threadID, 'cfg_hint_choice'));
        }
        return;
      }

      if (step === 'teamAName') {
        if (body) {
          clearTimeout(game.choiceTimeouts.nameA);
          await runConfig(api, threadID, 'teamAName', body);
        }
        return;
      }

      if (step === 'teamBName') {
        if (body) {
          clearTimeout(game.choiceTimeouts.nameB);
          await runConfig(api, threadID, 'teamBName', body);
        }
        return;
      }

      if (step === 'teamSize') {
        if (['1', '2'].includes(body)) {
          clearTimeout(game.choiceTimeouts.size);
          await runConfig(api, threadID, 'teamSize', body);
        } else if (body) {
          await plain(api, threadID, t(threadID, 'cfg_hint_choice'));
        }
        return;
      }

      return;
    }

    if (body.toLowerCase() === 'join' && game.mode === 'team' && (game.joinPhase === 'A' || game.joinPhase === 'B')) {
      await handleJoin(api, threadID, senderID);
      return;
    }

    if (event.messageReply?.messageID === game.messageID) {
      await handleAnswer(api, event, threadID, senderID);
    }
  },
};
