// ルーム状態の保存層。
// 本番(Vercel): Upstash Redis / Vercel KV（環境変数が設定されていれば自動でこちら）
// ローカル開発: インメモリ（単一プロセスなので共有される。ロック不要）

const TTL_SECONDS = 60 * 60 * 3; // 使い捨ての部屋: 3時間で自動消滅
const LOCK_MS = 4000;

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
if (redisUrl && redisToken) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({ url: redisUrl, token: redisToken });
}

const mem = new Map(); // code -> room（ローカル開発用）

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getRoom(code) {
  if (!code) return null;
  if (redis) {
    const v = await redis.get(`room:${code}`);
    if (v == null) return null;
    return typeof v === 'string' ? JSON.parse(v) : v; // Upstashは自動でparseする場合がある
  }
  return mem.get(code) || null;
}

async function setRoom(code, room) {
  if (redis) {
    await redis.set(`room:${code}`, JSON.stringify(room), { ex: TTL_SECONDS });
  } else {
    mem.set(code, room);
  }
}

// 部屋単位の read-modify-write を直列化する。
// redis: SET NX ロック。memory: JSが単一スレッドで get→mutate→set 間に await が無いためロック不要。
async function withLock(code, fn) {
  if (!redis) return fn();
  const lockKey = `lock:${code}`;
  const token = `${Date.now()}-${Math.random()}`;
  let acquired = false;
  for (let i = 0; i < 60; i++) {
    const ok = await redis.set(lockKey, token, { nx: true, px: LOCK_MS });
    if (ok) { acquired = true; break; }
    await sleep(50);
  }
  try {
    return await fn();
  } finally {
    if (acquired) {
      try { await redis.del(lockKey); } catch (_) { /* 期限切れ等は無視 */ }
    }
  }
}

module.exports = { getRoom, setRoom, withLock, usingRedis: !!redis };
