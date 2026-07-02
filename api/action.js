// POST /api/action  { code, playerId, type, payload } -> { ok, state } | { ok:false, error }
// type: heartbeat | startRound | submitAnswer | reveal | judge | reset
const { getRoom, setRoom, withLock } = require('../lib/store');
const game = require('../lib/game');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });
  const { code: rawCode, playerId, type, payload } = req.body || {};
  const code = (rawCode || '').toUpperCase().trim();
  const now = Date.now();

  const result = await withLock(code, async () => {
    const room = await getRoom(code);
    if (!room) return { ok: false, error: '部屋が見つかりません（時間切れで消えた可能性があります）' };
    if (!room.players[playerId]) return { ok: false, error: 'この部屋のメンバーではありません' };

    game.touch(room, playerId, now); // 在室更新 & 必要ならホスト委譲

    let r = { ok: true };
    switch (type) {
      case 'heartbeat': break;
      case 'startRound': r = game.startRound(room, playerId, payload?.topic, now); break;
      case 'submitAnswer': r = game.submitAnswer(room, playerId, payload?.answer, now); break;
      case 'reveal': r = game.reveal(room, playerId); break;
      case 'judge': r = game.judge(room, playerId, payload?.award, payload?.celebrate); break;
      case 'continue': r = game.continueRound(room, playerId); break;
      case 'reset': r = game.resetGame(room, playerId); break;
      default: r = { ok: false, error: '不明な操作です' };
    }

    // heartbeat 含め状態は更新される可能性があるので必ず保存
    await setRoom(code, room);
    if (!r.ok) return { ...r, state: game.serialize(room, playerId, now) };
    return { ok: true, state: game.serialize(room, playerId, now) };
  });

  if (!result.ok) return res.status(400).json(result);
  res.status(200).json(result);
};
