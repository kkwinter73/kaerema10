// GET /api/state?code=XXXX&playerId=YYYY -> { ok, state } | { ok:false, error }
// 読み取り専用（ロック無し・書き込み無し）。ポーリング用の軽量エンドポイント。
const { getRoom } = require('../lib/store');
const game = require('../lib/game');

module.exports = async (req, res) => {
  const code = (req.query.code || '').toUpperCase().trim();
  const playerId = req.query.playerId || '';
  const room = await getRoom(code);
  if (!room) return res.status(404).json({ ok: false, error: 'not found' });
  res.status(200).json({ ok: true, state: game.serialize(room, playerId, Date.now()) });
};
