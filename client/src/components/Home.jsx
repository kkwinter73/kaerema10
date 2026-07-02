import React, { useState } from 'react';

export default function Home({ onCreate, onJoin }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const canCreate = name.trim().length > 0;
  const canJoin = name.trim().length > 0 && code.trim().length >= 4;

  return (
    <div className="home">
      <div className="term home-hero">
        <div className="term-titlebar">
          <span className="term-dots">
            <span className="term-dot r" />
            <span className="term-dot y" />
            <span className="term-dot g" />
          </span>
          <span className="term-title">~/party — 終われま10</span>
        </div>
        <div className="term-body">
          <h2 className="h1 title-xl">終われま<span className="accent">10</span></h2>
          <p className="tagline">みんなで「せーの！」。10回一致したら、帰れる。</p>

          <label className="field">
            <span>あなたの名前</span>
            <input
              value={name}
              maxLength={20}
              placeholder="例: たなか"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="home-actions">
            <div className="panel">
              <h3>部屋をつくる（進行役）</h3>
              <p className="hint">お題を出す進行役になります。合言葉が発行されます。</p>
              <button className="btn primary" disabled={!canCreate} onClick={() => onCreate(name.trim())}>
                部屋をつくる
              </button>
            </div>

            <div className="panel">
              <h3>部屋に入る</h3>
              <input
                className="code-input"
                value={code}
                maxLength={4}
                placeholder="あいことば"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button className="btn" disabled={!canJoin} onClick={() => onJoin(code.trim(), name.trim())}>
                入る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
