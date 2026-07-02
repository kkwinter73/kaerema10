import React from 'react';

export default function PlayerList({ players, phase }) {
  return (
    <div className="playerlist card">
      <h3>参加者 ({players.filter((p) => p.connected).length})</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id} className={p.connected ? '' : 'offline'}>
            <span className="p-name">
              {p.isHost && <span className="crown" title="ホスト">👑</span>}
              {p.name}
            </span>
            {phase === 'answering' && (
              <span className={`p-status ${p.hasAnswered ? 'done' : ''}`}>
                {p.hasAnswered ? '回答済' : '考え中'}
              </span>
            )}
            {!p.connected && <span className="p-status">切断</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
