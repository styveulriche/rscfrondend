import { useState, useMemo, useCallback } from 'react';
import { FaEnvelopeOpen, FaEnvelope } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { listMessagesByUser, markMessageRead } from '../services/messages';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const initialsFromSender = (name) => {
  if (!name) return '?';
  const [first, second] = name.split(' ');
  if (second) return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

function Messagerie() {
  const { user } = useAuth();
  const [updatingId, setUpdatingId] = useState(null);
  const [status, setStatus] = useState(null);

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    return listMessagesByUser(user.id, { page: 0, size: 20, sort: 'createdAt,desc' });
  }, [user?.id]);

  const { data, loading, refresh, lastUpdated, error } = useRealtimeResource(
    `messages-${user?.id || 'guest'}`,
    fetcher,
    {
      enabled: Boolean(user?.id),
      immediate: Boolean(user?.id),
      interval: REALTIME_INTERVALS.messages,
    },
  );

  const messages = useMemo(() => normalizeList(data).map((item, idx) => ({
    id: item?.id ?? `row-${idx}`,
    sender: item?.expediteur || item?.sender || 'RSC',
    preview: item?.aperçu || item?.preview || item?.contenu || item?.content || '',
    time: item?.createdAt || item?.date,
    read: Boolean(item?.lu ?? item?.read ?? false),
  })), [data]);

  const handleMarkRead = async (message) => {
    if (!message?.id || message.read) return;
    setUpdatingId(message.id);
    setStatus(null);
    try {
      await markMessageRead(message.id);
      await refresh();
    } catch (err) {
      const messageText = err?.response?.data?.message || err?.message || 'Impossible de mettre à jour le message.';
      setStatus({ type: 'error', message: messageText });
    } finally {
      setUpdatingId(null);
    }
  };
  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>
            <FaEnvelopeOpen size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
            Messagerie
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>
        {status && (
          <div style={{ color: 'var(--red-primary)', fontSize: 12, marginBottom: 12 }}>{status.message}</div>
        )}
        {error && (
          <div style={{ color: 'var(--red-primary)', fontSize: 12, marginBottom: 12 }}>Impossible de récupérer les messages.</div>
        )}
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '20px 0' }}>Aucun message.</div>
        )}
        {messages.map((msg) => (
          <div className="message-item" key={msg.id} style={{ opacity: msg.read ? 0.75 : 1 }}>
            <div className="message-avatar">{initialsFromSender(msg.sender)}</div>
            <div className="message-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p className="message-sender">{msg.sender}</p>
                {!msg.read && (
                  <span style={{ background: 'var(--red-primary)', borderRadius: '50%', width: 8, height: 8, display: 'inline-block', flexShrink: 0 }} />
                )}
              </div>
              <p className="message-preview">{msg.preview}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span className="message-time">{formatTime(msg.time)}</span>
              {msg.read ? (
                <FaEnvelopeOpen size={13} color="var(--text-gray)" />
              ) : (
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => handleMarkRead(msg)} disabled={updatingId === msg.id}>
                  <FaEnvelope size={13} color="var(--red-primary)" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Messagerie;
