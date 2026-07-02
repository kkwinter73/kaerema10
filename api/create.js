// POST /api/create  { name } -> { ok, code, playerId, state }
const { getRoom, setRoom, withLock } = require('../lib/store');
const game = require('../lib/game');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });
  const { name } = req.body || {};
  const now = Date.now();

  // 空きコードを探す
  let code = null;
  for (let i = 0; i < 20; i++) {
    const c = game.makeCode();
    if (!(await getRoom(c))) { code = c; break; }
  }
  if (!code) return res.status(503).json({ ok: false, error: '混雑しています。少し待って再試行してください' });

  const playerId = game.makePlayerId();
  const room = game.newRoom(code, playerId, name, now);
  await withLock(code, () => setRoom(code, room));

  res.status(200).json({ ok: true, code, playerId, state: game.serialize(room, playerId, now) });
};
