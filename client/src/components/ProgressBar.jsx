import React from 'react';

export default function ProgressBar({ count, goal, lastAward }) {
  return (
    <div className="progress card">
      <div className="progress-head">
        <span className="progress-label">一致カウント</span>
        <span className="progress-count">
          {count} <span className="slash">/ {goal}</span>
        </span>
      </div>
      <div className="dots">
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} className={`dot ${i < count ? 'on' : ''}`}>{i < count ? '●' : '○'}</span>
        ))}
      </div>
      {lastAward != null && lastAward > 0 && (
        <div className="last-award">前ラウンド +{lastAward} 一致！</div>
      )}
    </div>
  );
}
