import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import GroupCard from '../components/GroupCard';

const DURATIONS = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

export default function Lobby() {
  const { auth } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', plannedDuration: 60 });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [soloForm, setSoloForm] = useState({ duration: 60 });
  const [joinedGroupId, setJoinedGroupId] = useState(null);
  const [pendingRequests, setPendingRequests] = useState({}); // groupId -> status
  const pollRef = useRef(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) setGroups(await res.json());
    } catch {}
  }, [auth.token]);

  useEffect(() => {
    fetchGroups().finally(() => setLoading(false));
    pollRef.current = setInterval(fetchGroups, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchGroups]);

  // Listen for join response
  useEffect(() => {
    if (!socket) return;
    const onJoinResponse = ({ groupId, accepted }) => {
      if (accepted) {
        navigate('/session', { state: { groupId, isAdmin: false } });
      } else {
        setPendingRequests((prev) => ({ ...prev, [groupId]: 'rejected' }));
      }
    };
    socket.on('group:join_response', onJoinResponse);
    return () => socket.off('group:join_response', onJoinResponse);
  }, [socket, navigate]);

  async function handleCreateGroup(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Failed to create'); return; }
      navigate('/session', { state: { groupId: data._id, isAdmin: true } });
    } catch {
      setCreateError('Network error');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinRequest(groupId) {
    setPendingRequests((prev) => ({ ...prev, [groupId]: 'pending' }));
    try {
      const res = await fetch(`/api/groups/${groupId}/join-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setPendingRequests((prev) => ({ ...prev, [groupId]: 'error:' + data.error }));
      }
    } catch {
      setPendingRequests((prev) => ({ ...prev, [groupId]: 'error:Network error' }));
    }
  }

  function handleStartSolo() {
    navigate('/session', { state: { solo: true, duration: soloForm.duration } });
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Solo session card */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Solo Session</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Duration</label>
            <select
              value={soloForm.duration}
              onChange={(e) => setSoloForm({ duration: Number(e.target.value) })}
              style={{ width: 140 }}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} minutes</option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 22 }}
            onClick={handleStartSolo}
          >
            Start Solo
          </button>
        </div>
      </div>

      {/* Group sessions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Group Sessions</h2>
        <button className="btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '+ Create Group'}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New Group</h3>
          <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label>Group Name</label>
              <input
                type="text"
                placeholder="e.g. Morning Grind"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                maxLength={50}
                required
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 160px', marginBottom: 0 }}>
              <label>Duration</label>
              <select
                value={createForm.plannedDuration}
                onChange={(e) => setCreateForm({ ...createForm, plannedDuration: Number(e.target.value) })}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary btn-sm" disabled={creating} style={{ height: 38 }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
          {createError && <p className="error-msg" style={{ marginTop: 8 }}>{createError}</p>}
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: 14 }}>
          No groups open right now. Create one or start solo!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map((group) => (
            <GroupCard
              key={group._id}
              group={group}
              currentUserId={auth.id}
              pendingStatus={pendingRequests[group._id]}
              onJoinRequest={() => handleJoinRequest(group._id)}
              onEnter={() => navigate('/session', { state: { groupId: group._id, isAdmin: group.adminId === auth.id } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
