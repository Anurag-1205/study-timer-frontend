import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function SessionRow({ record }) {
  const isCompleted = record.completed;
  const percent = Math.round((record.completedDuration / record.plannedDuration) * 100);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {record.type === 'solo' ? '🧘 Solo' : '👥 Group'}
              {record.type === 'group' && record.groupName && ` — ${record.groupName}`}
            </span>
            <span
              className="tag"
              style={{
                background: isCompleted ? 'rgba(76,175,130,0.15)' : 'rgba(124,111,255,0.12)',
                color: isCompleted ? 'var(--success)' : 'var(--accent)',
              }}
            >
              {isCompleted ? '✓ Completed' : `Partial`}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {formatDate(record.startedAt)}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
          <div>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{record.completedDuration} min</span>
            {' '}of {record.plannedDuration} min
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>{percent}% completed</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(percent, 100)}%`,
            background: isCompleted ? 'var(--success)' : 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.3s',
          }}
        />
      </div>

      {record.type === 'group' && record.memberUsernames?.length > 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          With: {record.memberUsernames.join(', ')}
        </div>
      )}
    </div>
  );
}

export default function History() {
  const { auth } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auth.token]);

  const totalMinutes = history.reduce((s, r) => s + r.completedDuration, 0);
  const totalSessions = history.length;
  const completedSessions = history.filter((r) => r.completed).length;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>My History</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
        Your personal achievement log — every minute here was earned.
      </p>

      {/* Stats */}
      {!loading && totalSessions > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Total sessions', value: totalSessions },
            { label: 'Completed', value: completedSessions },
            { label: 'Total focus time', value: `${totalMinutes} min` },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ flex: '1 1 140px', textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: 14 }}>
          No sessions yet. Complete your first session to see your history!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {history.map((record, i) => (
            <SessionRow key={record._id || i} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
