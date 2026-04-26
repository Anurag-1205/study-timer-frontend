import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import Timer from '../components/Timer';
import Chat from '../components/Chat';

const EXTENSION_OPTIONS = [10, 20, 30];

export default function Session() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { auth } = useAuth();

  const isSolo = state?.solo === true;
  const groupId = state?.groupId;
  const [isAdmin, setIsAdmin] = useState(state?.isAdmin || false);

  // Session state
  const [phase, setPhase] = useState('waiting'); // waiting | active | ended
  const [endsAt, setEndsAt] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [paused, setPaused] = useState(false);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [completedInfo, setCompletedInfo] = useState(null);

  // Extension prompt
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const [extensionUsed, setExtensionUsed] = useState(false);

  // Group info
  const [groupInfo, setGroupInfo] = useState(null);

  // Chat messages (in memory only)
  const [messages, setMessages] = useState([]);

  const duration = state?.duration || 60;

  const fetchGroupInfo = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroupInfo(data);
        setMembers(data.members || []);
        setJoinRequests(data.joinRequests || []);
        if (data.status === 'in_progress') {
          setPhase('active');
          setEndsAt(new Date(data.endsAt).getTime());
          setStartedAt(new Date(data.startedAt).getTime());
        }
      }
    } catch {}
  }, [groupId, auth.token]);

  // Join socket room for group sessions
  useEffect(() => {
    if (!socket) return;

    if (isSolo) {
      // Solo: start immediately
      socket.emit('solo:start', { duration });
      setPhase('active');
      setStartedAt(Date.now());
      setEndsAt(Date.now() + duration * 60 * 1000);
    } else {
      fetchGroupInfo();
      socket.emit('group:join_room', { groupId });
    }
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      'solo:started': ({ endsAt: ea, startedAt: sa }) => {
        setEndsAt(ea);
        setStartedAt(sa);
        setPhase('active');
      },
      'solo:paused': () => setPaused(true),
      'solo:resumed': ({ endsAt: ea }) => {
        setEndsAt(ea);
        setPaused(false);
      },
      'group:state': ({ endsAt: ea, startedAt: sa, members: m }) => {
        setEndsAt(ea);
        setStartedAt(sa);
        setMembers(m || []);
        setPhase('active');
      },
      'group:started': ({ endsAt: ea, startedAt: sa, members: m }) => {
        setEndsAt(ea);
        setStartedAt(sa);
        setMembers(m || []);
        setPhase('active');
      },
      'group:extended': ({ endsAt: ea }) => {
        setEndsAt(ea);
        setExtensionUsed(true);
        setShowExtensionPrompt(false);
      },
      'group:member_update': ({ members: m, joinRequests: jr }) => {
        if (m) setMembers(m);
        if (jr !== undefined) setJoinRequests(jr);
      },
      'group:member_left': ({ members: m }) => {
        if (m) setMembers(m);
      },
      'group:admin_transferred': ({ newAdminId, members: m }) => {
        if (m) setMembers(m);
        if (newAdminId === auth.id) {
          setIsAdmin(true);
          socket.emit('group:join_room', { groupId }); // re-join to get admin room
        }
      },
      'session:extension_prompt': ({ extensionUsed: eu }) => {
        if (!eu) setShowExtensionPrompt(true);
      },
      'session:ended': ({ reason, completedDuration }) => {
        setPhase('ended');
        setMessages([]); // clear chat
        setCompletedInfo({ reason, completedDuration });
      },
      'chat:message': (msg) => {
        setMessages((prev) => [...prev, msg]);
      },
      'error': ({ message }) => {
        console.error('Socket error:', message);
      },
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
  }, [socket, auth.id, groupId]);

  function handleSoloPause() {
    socket.emit('solo:pause');
  }

  function handleSoloResume() {
    socket.emit('solo:resume');
  }

  function handleSoloEnd() {
    if (!confirm('End session early?')) return;
    socket.emit('solo:end');
  }

  function handleGroupStart() {
    socket.emit('group:start', { groupId });
  }

  function handleGroupLeave() {
    if (phase === 'active') {
      if (!confirm('Leave session early? Your progress will be saved.')) return;
    }
    socket.emit('group:leave', { groupId });
    navigate('/lobby');
  }

  function handleExtend(minutes) {
    socket.emit('group:extend', { groupId, minutes });
    setShowExtensionPrompt(false);
  }

  function handleRespondRequest(targetUserId, accept) {
    socket.emit('group:respond_request', { groupId, targetUserId, accept });
  }

  function handleSendMessage(text) {
    if (isSolo) {
      socket.emit('chat:message', { text });
    } else {
      socket.emit('chat:message', { groupId, text });
    }
  }

  if (!state) {
    navigate('/lobby');
    return null;
  }

  // ─── Ended screen ───────────────────────────────────────────────
  if (phase === 'ended') {
    const isComplete = completedInfo?.reason === 'completed';
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>
            {isComplete ? '🎉' : '🌱'}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>
            {isComplete ? 'Session Complete!' : 'Session Ended'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>
            {isComplete
              ? "Outstanding work. Every focused minute compounds."
              : completedInfo?.reason === 'dissolved'
              ? 'The group session was dissolved.'
              : 'You ended the session early — still progress worth acknowledging.'}
          </p>
          {completedInfo?.completedDuration != null && (
            <div
              style={{
                margin: '20px 0',
                background: 'var(--accent-dim)',
                borderRadius: 'var(--radius)',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>
                {completedInfo.completedDuration} min
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>focused time</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            <button className="btn-primary" onClick={() => navigate('/lobby')}>Back to Lobby</button>
            <button className="btn-ghost" onClick={() => navigate('/history')}>View History</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active / Waiting layout ────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>

      {/* Left: Timer + controls */}
      <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Timer card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>
            {isSolo ? '🧘 Solo Session' : `👥 ${groupInfo?.name || 'Group Session'}`}
          </div>

          {phase === 'waiting' ? (
            <div>
              <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -2, color: 'var(--text-muted)', margin: '20px 0' }}>
                {groupInfo?.plannedDuration || 60}:00
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                {isAdmin ? 'Start the session when everyone is ready.' : 'Waiting for admin to start…'}
              </p>
              {isAdmin && (
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleGroupStart}>
                  Start Session
                </button>
              )}
            </div>
          ) : (
            <Timer endsAt={endsAt} paused={paused} />
          )}

          {phase === 'active' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              {isSolo && (
                <>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={paused ? handleSoloResume : handleSoloPause}
                  >
                    {paused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                  <button className="btn-danger btn-sm" onClick={handleSoloEnd}>
                    End Session
                  </button>
                </>
              )}
              {!isSolo && (
                <button className="btn-danger btn-sm" onClick={handleGroupLeave}>
                  Leave Session
                </button>
              )}
            </div>
          )}

          {phase === 'waiting' && !isSolo && (
            <button
              className="btn-ghost btn-sm"
              style={{ marginTop: 16 }}
              onClick={handleGroupLeave}
            >
              Leave Group
            </button>
          )}
        </div>

        {/* Extension prompt for admin */}
        {showExtensionPrompt && isAdmin && !extensionUsed && (
          <div
            className="card"
            style={{ borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}
          >
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Session ending in 2 minutes!</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Extend the session for everyone?
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EXTENSION_OPTIONS.map((m) => (
                <button key={m} className="btn-primary btn-sm" onClick={() => handleExtend(m)}>
                  +{m} min
                </button>
              ))}
              <button className="btn-ghost btn-sm" onClick={() => setShowExtensionPrompt(false)}>
                No thanks
              </button>
            </div>
          </div>
        )}

        {/* Group members panel */}
        {!isSolo && (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Members ({members.length}/{groupInfo?.maxMembers || 6})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m) => (
                <div
                  key={m.userId || m._id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--success)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 14 }}>{m.username}</span>
                  {(m.userId?.toString() === groupInfo?.adminId?.toString() ||
                    m.userId === groupInfo?.adminId) && (
                    <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 'auto' }}>admin</span>
                  )}
                </div>
              ))}
            </div>

            {/* Join requests — only admin sees */}
            {isAdmin && joinRequests.length > 0 && (
              <>
                <hr className="divider" />
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                  Join requests
                </h4>
                {joinRequests.map((r) => (
                  <div
                    key={r.userId}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}
                  >
                    <span style={{ flex: 1, fontSize: 14 }}>{r.username}</span>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleRespondRequest(r.userId.toString(), true)}
                      disabled={members.length >= (groupInfo?.maxMembers || 6)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => handleRespondRequest(r.userId.toString(), false)}
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Chat */}
      <div style={{ flex: '1 1 300px' }}>
        <Chat messages={messages} onSend={handleSendMessage} active={phase === 'active'} />
      </div>
    </div>
  );
}
