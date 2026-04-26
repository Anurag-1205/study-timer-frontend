import React, { useState, useEffect } from 'react';

function pad(n) {
  return String(Math.max(0, n)).padStart(2, '0');
}

export default function Timer({ endsAt, paused }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    if (paused) return;
    const tick = () => setRemaining(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt, paused]);

  const totalSecs = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const isWarning = remaining < 2 * 60 * 1000 && remaining > 0;
  const isDone = remaining === 0;

  return (
    <div style={{ margin: '16px 0' }}>
      <div
        style={{
          fontSize: hours > 0 ? 52 : 64,
          fontWeight: 700,
          letterSpacing: -3,
          fontVariantNumeric: 'tabular-nums',
          color: isDone ? 'var(--success)' : isWarning ? 'var(--danger)' : 'var(--text)',
          transition: 'color 0.5s',
          lineHeight: 1,
        }}
      >
        {hours > 0 && `${pad(hours)}:`}
        {pad(mins)}:{pad(secs)}
      </div>
      {paused && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--accent)',
            marginTop: 8,
            fontWeight: 500,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Paused
        </div>
      )}
      {isWarning && !paused && (
        <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>
          Less than 2 minutes remaining
        </div>
      )}
    </div>
  );
}
