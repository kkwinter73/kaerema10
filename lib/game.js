// 終われま10 — 純粋なゲームロジック（保存層に依存しない）
// room はプレーンなJSONオブジェクト。Redis/メモリのどちらにもそのまま保存できる。

const { pickTopic } = require('./topics');

const GOAL = 10; // 累計でこの回数「一致」したらクリア
const CONNECT_WINDOW_MS = 12000; // これ以内に heartbeat があれば「在室中」
const MAX_PLAYERS = 12;
const MAX_DRAW_BYTES = 200000; // お絵かき回答(dataURL)の上限

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function makePlayerId() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function newRoom(code, hostId, hostName, now) {
  return {
    code,
    hostId,
    phase: 'lobby', // lobby | answering | reveal | finished
    topic: '',
    round: 0,
    goal: GOAL,
    matchCount: 0,
    players: {
      [hostId]: { id: hostId, name: (hostName || 'ホスト').slice(0, 20), joinedAt: now, lastSeen: now },
    },
    answers: {},
    lastAward: null,
    lastTopic: '',
    usedTopics: [], // この回で既に出したお題（繰り返し防止）
    celebrateSeq: 0, // 全員一致のたびに+1。クライアントが増加を検知して演出を出す。
    history: [],
  };
}

// 回答を正規化。文字 or お絵かき(dataURL)の両方を許容。
function normalizeAnswer(a) {
  if (a && typeof a === 'object') {
    if (a.kind === 'draw' && typeof a.value === 'string' && a.value.startsWith('data:image')) {
      return { kind: 'draw', value: a.value.slice(0, MAX_DRAW_BYTES) };
    }
    if (a.kind === 'text') {
      const t = String(a.value || '').trim().slice(0, 40);
      return t ? { kind: 'text', value: t } : null;
    }
    return null;
  }
  // 後方互換: 文字列で来た場合
  const t = String(a || '').trim().slice(0, 40);
  return t ? { kind: 'text', value: t } : null;
}

function addPlayer(room, id, name, now) {
  if (Object.keys(room.players).length >= MAX_PLAYERS) {
    return { ok: false, error: 'この部屋は満員です（最大12人）' };
  }
  room.players[id] = { id, name: (name || '名無し').slice(0, 20), joinedAt: now, lastSeen: now };
  return { ok: true };
}

function connectedIds(room, now) {
  return Object.values(room.players)
    .filter((p) => now - p.lastSeen < CONNECT_WINDOW_MS)
    .map((p) => p.id);
}

// heartbeat / 何らかの操作のたびに呼ぶ。在室更新＋ホスト不在なら委譲。
function touch(room, id, now) {
  if (room.players[id]) room.players[id].lastSeen = now;
  const host = room.players[room.hostId];
  if (!host || now - host.lastSeen >= CONNECT_WINDOW_MS) {
    // 在室中で最も早く参加した人を新ホストに
    const next = Object.values(room.players)
      .filter((p) => now - p.lastSeen < CONNECT_WINDOW_MS)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) room.hostId = next.id;
  }
}

function requireHost(room, id) {
  if (room.hostId !== id) return { ok: false, error: 'ホストのみ操作できます' };
  return { ok: true };
}

function startRound(room, id, topic, now) {
  const h = requireHost(room, id);
  if (!h.ok) return h;
  // お題は自動選択（この回で出たものは避ける）。明示指定があればそれを使う。
  const chosen = topic && topic.trim() ? topic.trim().slice(0, 60) : pickTopic(room.usedTopics || []);
  room.phase = 'answering';
  room.topic = chosen;
  room.lastTopic = chosen;
  room.usedTopics = [...(room.usedTopics || []), chosen];
  room.round += 1;
  room.answers = {};
  room.lastAward = null;
  return { ok: true };
}

function submitAnswer(room, id, answer, now) {
  if (room.phase !== 'answering') return { ok: false, error: 'いま回答フェーズではありません' };
  const norm = normalizeAnswer(answer);
  if (!norm) return { ok: false, error: '回答を入力してください' };
  room.answers[id] = norm;
  // 在室中の全員がそろったら自動オープン
  const active = connectedIds(room, now);
  const allAnswered = active.length > 0 && active.every((pid) => room.answers[pid] != null);
  if (allAnswered) room.phase = 'reveal';
  return { ok: true };
}

function reveal(room, id) {
  const h = requireHost(room, id);
  if (!h.ok) return h;
  if (Object.keys(room.answers).length === 0) return { ok: false, error: 'まだ回答がありません' };
  room.phase = 'reveal';
  return { ok: true };
}

function judge(room, id, award, celebrate) {
  const h = requireHost(room, id);
  if (!h.ok) return h;
  if (room.phase !== 'reveal') return { ok: false, error: 'オープン後に判定してください' };
  const n = Math.max(0, Math.min(GOAL, Math.floor(Number(award) || 0)));
  room.matchCount = Math.min(room.goal, room.matchCount + n);
  room.lastAward = n;
  if (celebrate && n > 0) room.celebrateSeq = (room.celebrateSeq || 0) + 1; // 全員一致の演出トリガー
  room.history.push({
    round: room.round,
    topic: room.topic,
    answers: Object.values(room.players)
      .filter((p) => room.answers[p.id] != null)
      .map((p) => ({ name: p.name, answer: room.answers[p.id] })),
    award: n,
    celebrate: !!celebrate,
  });
  room.phase = room.matchCount >= room.goal ? 'finished' : 'lobby';
  return { ok: true };
}

function resetGame(room, id) {
  const h = requireHost(room, id);
  if (!h.ok) return h;
  room.phase = 'lobby';
  room.topic = '';
  room.round = 0;
  room.matchCount = 0;
  room.answers = {};
  room.lastAward = null;
  room.lastTopic = '';
  room.usedTopics = [];
  room.celebrateSeq = 0;
  room.history = [];
  return { ok: true };
}

// クライアントへ返す安全な状態（回答フェーズ中は他人の回答テキストを隠す）
function serialize(room, forId, now) {
  const connected = new Set(connectedIds(room, now));
  const players = Object.values(room.players)
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({
      id: p.id,
      name: p.name,
      connected: connected.has(p.id),
      isHost: p.id === room.hostId,
      hasAnswered: room.answers[p.id] != null,
    }));

  let answers = null;
  if (room.phase === 'reveal' || room.phase === 'finished') {
    answers = players
      .filter((p) => room.answers[p.id] != null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        kind: room.answers[p.id].kind,
        value: room.answers[p.id].value,
      }));
  }

  return {
    code: room.code,
    phase: room.phase,
    topic: room.topic,
    round: room.round,
    goal: room.goal,
    matchCount: room.matchCount,
    lastAward: room.lastAward,
    celebrateSeq: room.celebrateSeq || 0,
    cleared: room.matchCount >= room.goal,
    players,
    answeredCount: Object.keys(room.answers).length,
    playerCount: players.length,
    connectedCount: players.filter((p) => p.connected).length,
    answers,
    history: room.history,
    you: {
      id: forId,
      isHost: room.hostId === forId,
      myAnswer: room.answers[forId] ?? null,
    },
  };
}

module.exports = {
  GOAL,
  MAX_PLAYERS,
  makeCode,
  makePlayerId,
  newRoom,
  addPlayer,
  touch,
  connectedIds,
  startRound,
  submitAnswer,
  reveal,
  judge,
  resetGame,
  serialize,
};
