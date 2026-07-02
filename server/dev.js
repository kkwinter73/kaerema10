// ローカル開発用サーバー。
// Vercelの /api/* サーバーレス関数と「同じハンドラ」をExpressにマウントするだけ。
// 本番(Vercel)ではこのファイルは使われず、api/*.js が直接関数として動く。
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// api/*.js は (req, res) => {} 形式。Expressのreq/resと互換。
const create = require('../api/create');
const join = require('../api/join');
const action = require('../api/action');
const state = require('../api/state');

app.post('/api/create', create);
app.post('/api/join', join);
app.post('/api/action', action);
app.get('/api/state', state);

// 本番ビルド確認用（任意）: client/dist を配信
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('client not built. run: npm run build');
  });
});

const { usingRedis } = require('../lib/store');
app.listen(PORT, () => {
  console.log(`\n  終われま10 devサーバー: http://localhost:${PORT}`);
  console.log(`  保存先: ${usingRedis ? 'Redis' : 'インメモリ（ローカル）'}\n`);
});
