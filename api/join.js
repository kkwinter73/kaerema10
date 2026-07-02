// POST /api/join  { code, name } -> { ok, code, playerId, state } | { ok:false, error }
const { getRoom, setRoom, withLock } = require('../lib/store');
const game = require('../lib/game');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });
  const { code: rawCode, name } = req.body || {};
  const code = (rawCode || '').toUpperCase().trim();
  const now = Date.now();
  const playerId = game.makePlayerId();

  const result = await withLock(code, async () => {
    const room = await getRoom(code);
    if (!room) return { ok: false, error: 'その合言葉の部屋は見つかりません' };
    const added = game.addPlayer(room, playerId, name, now);
    if (!added.ok) return added;
    await setRoom(code, room);
    return { ok: true, state: game.serialize(room, playerId, now) };
  });

  if (!result.ok) return res.status(400).json(result);
  res.status(200).json({ ok: true, code, playerId, state: result.state });
};
