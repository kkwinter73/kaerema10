// サーバーとのHTTPやり取り（同一オリジン。devはViteが /api をプロキシ）

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ ok: false, error: '通信エラー' }));
  return data;
}

export function createRoom(name) {
  return post('/api/create', { name });
}

export function joinRoom(code, name) {
  return post('/api/join', { code, name });
}

export function sendAction(code, playerId, type, payload) {
  return post('/api/action', { code, playerId, type, payload });
}

export async function fetchState(code, playerId) {
  const res = await fetch(`/api/state?code=${encodeURIComponent(code)}&playerId=${encodeURIComponent(playerId)}`);
  if (!res.ok) return { ok: false };
  return res.json().catch(() => ({ ok: false }));
}
