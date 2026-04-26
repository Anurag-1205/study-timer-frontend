import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Chat({ messages, onSend, active }) {
  const { auth } = useAuth();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !active) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <div
      className="card"
      style={{
        height: '100%',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>💬 Session Chat</span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontWeight: 400,
            marginLeft: 'auto',
          }}
        >
          Messages disappear when session ends
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: 13,
              marginTop: 32,
            }}
          >
            {active ? 'Say something to your study group…' : 'Chat is available once the session starts.'}
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.from === auth.username;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              {!isMe && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  {msg.from}
                </span>
              )}
              <div
                style={{
                  background: isMe ? 'var(--accent)' : 'var(--surface2)',
                  color: isMe ? '#fff' : 'var(--text)',
                  borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  padding: '8px 12px',
                  fontSize: 14,
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 14px',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          placeholder={active ? 'Type a message…' : 'Session not started yet'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!active}
          maxLength={500}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn-primary btn-sm"
          disabled={!active || !text.trim()}
          style={{ flexShrink: 0 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
