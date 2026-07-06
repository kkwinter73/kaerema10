import React, { useEffect, useRef, useState } from 'react';
import ProgressBar from './ProgressBar.jsx';
import PlayerList from './PlayerList.jsx';
import DrawCanvas from './DrawCanvas.jsx';
import { playClick, playReveal, playMatch, playWrong, playClear } from '../sound.js';

export default function Game({ state, onAction, onLeave }) {
  const { phase, you, cleared } = state;
  const isHost = you.isHost;
  const emit = (type, payload) => { onAction(type, payload); };

  // --- 演出（音・赤い発光） ---
  const [flash, setFlash] = useState(false);
  const [missFlash, setMissFlash] = useState(false);
  const seqRef = useRef(state.celebrateSeq);
  const missRef = useRef(state.missSeq);
  const phaseRef = useRef(phase);
  const clearedRef = useRef(cleared);

  useEffect(() => {
    if (state.celebrateSeq !== seqRef.current) {
      seqRef.current = state.celebrateSeq;
      setFlash(true);
      playMatch();
      const t = setTimeout(() => setFlash(false), 1700);
      return () => clearTimeout(t);
    }
  }, [state.celebrateSeq]);

  useEffect(() => {
    if (state.missSeq !== missRef.current) {
      missRef.current = state.missSeq;
      setMissFlash(true);
      playWrong();
      const t = setTimeout(() => setMissFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state.missSeq]);

  useEffect(() => {
    if (phase === 'reveal' && phaseRef.current !== 'reveal') playReveal();
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (cleared && !clearedRef.current) { clearedRef.current = true; playClear(); }
  }, [cleared]);

  const focus = phase === 'answering' || phase === 'reveal';

  // 判定 → 演出を見せてから次へ（ホストのみ実行）
  const judgeThenContinue = (award, celebrate) => {
    emit('judge', { award, celebrate });
    const delay = celebrate ? 1900 : 1200; // 不一致は不正解音を鳴らしてから次へ
    setTimeout(() => emit('continue'), delay);
  };

  return (
    <div className="game">
      <div className="room-head card">
        <div>
          <span className="label">あいことば</span>
          <span className="code-badge">{state.code}</span>
        </div>
        <div className="round-info">
          <span className="label">ラウンド {state.round}</span>
          <button className="btn ghost sm" onClick={onLeave}>退出</button>
        </div>
      </div>

      <ProgressBar count={state.matchCount} goal={state.goal} lastAward={state.lastAward} />

      <div className={`layout ${focus ? 'focus' : ''}`}>
        <main className="stage card">
          {cleared || phase === 'finished' ? (
            <Finished state={state} isHost={isHost} onReset={() => emit('reset')} />
          ) : phase === 'lobby' ? (
            <Lobby state={state} isHost={isHost} onStart={() => emit('startRound', {})} />
          ) : phase === 'answering' ? (
            <Answering
              state={state}
              isHost={isHost}
              onSubmit={(answer) => { playClick(); emit('submitAnswer', { answer }); }}
              onReveal={() => emit('reveal')}
            />
          ) : phase === 'reveal' ? (
            <Reveal
              state={state}
              isHost={isHost}
              flash={flash}
              missFlash={missFlash}
              onJudge={judgeThenContinue}
            />
          ) : null}
        </main>

        {!focus && (
          <aside className="side">
            <PlayerList players={state.players} phase={phase} />
          </aside>
        )}
      </div>
    </div>
  );
}

function Lobby({ state, isHost, onStart }) {
  if (!isHost) {
    return (
      <div className="center-msg">
        <div className="big-emoji">⏳</div>
        <p>進行役がお題を出すのを待っています…</p>
        {state.round > 0 && <p className="hint">前回：「{state.topic}」→ +{state.lastAward} 一致</p>}
      </div>
    );
  }
  return (
    <div className="lobby center-stage">
      <h2>{state.round === 0 ? 'ゲーム開始！' : 'つぎのお題へ'}</h2>
      <p className="hint">お題はおまかせ。ボタンを押すとランダムに出題されます。</p>
      <button className="btn primary huge" disabled={state.playerCount < 1} onClick={onStart}>
        🎲 お題を出す
      </button>
      {state.round > 0 && <p className="hint after">前回：「{state.topic}」→ +{state.lastAward} 一致</p>}
    </div>
  );
}

function Answering({ state, isHost, onSubmit, onReveal }) {
  const my = state.you.myAnswer; // { kind, value } | null
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const canvasRef = useRef(null);
  const connected = state.players.filter((p) => p.connected);

  const submit = () => {
    if (mode === 'text') {
      if (!text.trim()) return;
      onSubmit({ kind: 'text', value: text.trim() });
    } else {
      if (!canvasRef.current || canvasRef.current.isBlank()) return;
      onSubmit({ kind: 'draw', value: canvasRef.current.getDataURL() });
    }
  };

  return (
    <div className="answering center-stage">
      <div className="topic-hero">
        <span className="topic-eyebrow">せーの、で答えて！</span>
        <p className="topic-big">{state.topic}</p>
      </div>

      {my ? (
        <div className="submitted-box">
          <div className="big-emoji">✅</div>
          <p className="submitted-label">あなたの回答</p>
          {my.kind === 'draw' ? (
            <img className="submitted-img" src={my.value} alt="あなたの回答" />
          ) : (
            <p className="submitted-text">「{my.value}」</p>
          )}
          <p className="hint">みんなが揃うと自動でオープン！</p>
        </div>
      ) : (
        <div className="answer-area">
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'text' ? 'on' : ''}`} onClick={() => setMode('text')}>あ 文字</button>
            <button className={`mode-btn ${mode === 'draw' ? 'on' : ''}`} onClick={() => setMode('draw')}>✎ お絵かき</button>
          </div>

          {mode === 'text' ? (
            <input
              className="answer-input-big"
              value={text}
              maxLength={40}
              placeholder="ここに答えを入力"
              autoFocus
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          ) : (
            <div className="canvas-wrap">
              <DrawCanvas ref={canvasRef} />
              <button className="btn ghost sm" onClick={() => canvasRef.current?.clear()}>消す</button>
            </div>
          )}

          <button className="btn primary huge" onClick={submit}>これで決定！</button>
        </div>
      )}

      <div className="answer-chips">
        {connected.map((p) => (
          <span key={p.id} className={`chip ${p.hasAnswered ? 'done' : ''}`}>
            {p.hasAnswered ? '✓ ' : ''}{p.name}
          </span>
        ))}
      </div>

      {isHost && (
        <div className="host-controls">
          <button className="btn ghost" onClick={onReveal} disabled={state.answeredCount === 0}>
            そろわなくてもオープン（{state.answeredCount}人）
          </button>
        </div>
      )}
    </div>
  );
}

function Reveal({ state, isHost, flash, missFlash, onJudge }) {
  return (
    <div className="reveal center-stage">
      <div className="topic-hero small">
        <span className="topic-eyebrow">お題</span>
        <p className="topic-big">{state.topic}</p>
      </div>

      <div className={`answer-list ${flash ? 'lit' : ''}`}>
        {state.answers.map((a) => (
          <div key={a.id} className="answer-card big">
            {a.kind === 'draw' ? (
              <img className="answer-img" src={a.value} alt={a.name} />
            ) : (
              <div className="answer-value">{a.value}</div>
            )}
            <div className="answer-name">{a.name}</div>
          </div>
        ))}
      </div>

      {state.judged ? (
        <p className="center-msg hint">{flash ? '🎉 全員一致！' : missFlash ? '残念…不一致' : '集計中…'}</p>
      ) : isHost ? (
        <div className="judge-box simple">
          <button className="btn match-btn" onClick={() => onJudge(1, true)}>🎉 全員一致！（+1）</button>
          <button className="btn wide" onClick={() => onJudge(0, false)}>不一致（+0）</button>
        </div>
      ) : (
        <p className="center-msg hint">進行役が判定しています…</p>
      )}
    </div>
  );
}

function Finished({ state, isHost, onReset }) {
  return (
    <div className="finished">
      <div className="big-emoji">🎊</div>
      <h2>クリア！帰れます！</h2>
      <p>{state.goal}回の一致を達成しました（{state.round}ラウンド）</p>
      {state.history.length > 0 && (
        <div className="history">
          <h3>これまでのお題</h3>
          <ul>
            {state.history.map((h, i) => (
              <li key={i}>
                <span className="h-round">R{h.round}</span>「{h.topic}」<span className="h-award">+{h.award}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isHost && <button className="btn primary big" onClick={onReset}>もう一度あそぶ</button>}
    </div>
  );
}
