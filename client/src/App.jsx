import React, { useEffect, useRef, useState } from 'react';
import * as api from './api.js';
import { setMuted } from './sound.js';
import Home from './components/Home.jsx';
import Game from './components/Game.jsx';

const POLL_MS = 1200; // 状態ポーリング間隔
const HEARTBEAT_MS = 5000; // 在室ハートビート間隔
const SESSION_KEY = 'owarema10.session';

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(loadSession); // { code, playerId }
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState('');
  const [mute, setMute] = useState(false);

  const toggleMute = () => {
    setMute((m) => {
      setMuted(!m);
      return !m;
    });
  };
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  const saveSession = (s, initialState) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
    if (initialState) setState(initialState);
  };

  // ポーリング + ハートビート
  useEffect(() => {
    if (!session) return;
    let alive = true;

    const poll = async () => {
      const { code, playerId } = sessionRef.current || {};
      if (!code) return;
      const res = await api.fetchState(code, playerId);
      if (!alive) return;
      if (res?.ok) {
        setState(res.state);
        setConnected(true);
      } else {
        setConnected(false);
      }
    };

    const beat = async () => {
      const { code, playerId } = sessionRef.current || {};
      if (!code) return;
      const res = await api.sendAction(code, playerId, 'heartbeat');
      if (alive && res?.ok && res.state) setState(res.state);
    };

    poll();
    beat();
    const pollId = setInterval(poll, POLL_MS);
    const beatId = setInterval(beat, HEARTBEAT_MS);
    return () => {
      alive = false;
      clearInterval(pollId);
      clearInterval(beatId);
    };
  }, [session]);

  const createRoom = async (name) => {
    const res = await api.createRoom(name);
    if (res?.ok) saveSession({ code: res.code, playerId: res.playerId }, res.state);
    else showError(res?.error || '部屋の作成に失敗しました');
  };

  const joinRoom = async (code, name) => {
    const res = await api.joinRoom(code, name);
    if (res?.ok) saveSession({ code: res.code, playerId: res.playerId }, res.state);
    else showError(res?.error || '入室に失敗しました');
  };

  // Gameからの操作。成功時は返ってきた最新stateで即時更新。
  const doAction = async (type, payload) => {
    const { code, playerId } = sessionRef.current || {};
    const res = await api.sendAction(code, playerId, type, payload);
    if (res?.ok && res.state) setState(res.state);
    else if (res && res.ok === false) showError(res.error || '操作に失敗しました');
    return res;
  };

  const leave = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setState(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="spacer" />
        <button className="sound-toggle" onClick={toggleMute} title="音のオン/オフ">
          {mute ? '🔇' : '🔊'}
        </button>
        {session && (
          <span className={`conn ${connected ? 'ok' : 'ng'}`}>{connected ? '接続中' : '再接続中'}</span>
        )}
      </header>

      {error && <div className="toast">{error}</div>}

      {!session || !state ? (
        <Home onCreate={createRoom} onJoin={joinRoom} />
      ) : (
        <Game state={state} onAction={doAction} onLeave={leave} />
      )}

      <footer className="foot">$ Zoomをつなぎながら、各自の端末から参加してね</footer>
    </div>
  );
}
