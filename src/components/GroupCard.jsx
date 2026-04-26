import React from 'react';

export default function GroupCard({ group, currentUserId, pendingStatus, onJoinRequest, onEnter }) {
  const isWaiting = group.status === 'waiting';
  const isInProgress = group.status === 'in_progress';
  const isFull = group.members.length >= group.maxMembers;
  const isMember = group.members.some(
    (m) => (m.userId?._id || m.userId)?.toString() === currentUserId
  );
  const isAdmin = group.adminId?.toString() === currentUserId || group.adminId === currentUserId;

  const statusLabel = isWaiting ? 'Waiting' : isInProgress ? 'In Progress' : 'Ended';
  const statusClass = isWaiting ? 'tag-waiting' : isInProgress ? 'tag-progress' : '';

  let actionButton = null;
  if (isMember || isAdmin) {
    actionButton = (
      <button className="btn-primary btn-sm" onClick={onEnter}>
        Enter
      </button>
    );
  } else if (isInProgress) {
    actionButton = (
      <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Session in progress</span>
    );
  } else if (isFull) {
    actionButton = (
      <span className="tag tag-full">Full</span>
    );
  } else if (pendingStatus === 'pending') {
    actionButton = (
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Request sent…</span>
    );
  } else if (pendingStatus?.startsWith('error:')) {
    actionButton = (
      <span style={{ fontSize: 13, color: 'var(--danger)' }}>{pendingStatus.slice(6)}</span>
    );
  } else if (pendingStatus === 'rejected') {
    actionButton = (
      <span style={{ fontSize: 13, color: 'var(--danger)' }}>Request rejected</span>
    );
  } else {
    actionButton = (
      <button className="btn-ghost btn-sm" onClick={onJoinRequest}>
        Request to Join
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: '16px 20px',
      }}
    >
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{group.name}</span>
          <span className={`tag ${statusClass}`}>{statusLabel}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          by {group.adminUsername} · {group.plannedDuration} min
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {Array.from({ length: group.maxMembers }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i < group.members.length ? 'var(--success)' : 'var(--border)',
            }}
          />
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
          {group.members.length}/{group.maxMembers}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>{actionButton}</div>
    </div>
  );
}
