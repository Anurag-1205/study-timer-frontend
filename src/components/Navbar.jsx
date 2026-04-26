import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const { pathname } = useLocation();

  if (!auth) return null;

  const links = [
    { to: '/lobby', label: 'Lobby' },
    { to: '/history', label: 'History' },
  ];

  return (
    <nav
      style={{
        height: 60,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 24,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Link to="/lobby" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>⏱</span> Study Focus
      </Link>

      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              fontSize: 14,
              fontWeight: 500,
              color: pathname === to ? 'var(--accent)' : 'var(--text-muted)',
              background: pathname === to ? 'var(--accent-dim)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{auth.username}</span>
        <button className="btn-ghost btn-sm" onClick={logout}>Sign out</button>
      </div>
    </nav>
  );
}
