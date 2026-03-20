import { useState, useMemo, useCallback } from 'react';
import { FaBell, FaBellSlash, FaCheckDouble } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { listNotificationsByUser, markNotificationRead, markAllNotificationsRead } from '../services/notifications';
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

function Notifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    return listNotificationsByUser(user.id, { page: 0, size: 20, sort: 'createdAt,desc' });
  }, [user?.id]);

  const { data, loading, refresh, lastUpdated, error } = useRealtimeResource(
    `notifications-${user?.id || 'guest'}`,
    fetcher,
    {
      enabled: Boolean(user?.id),
      immediate: Boolean(user?.id),
      interval: REALTIME_INTERVALS.notifications,
    },
  );

  const notifications = useMemo(() => normalizeList(data).map((item, idx) => ({
    id: item?.id ?? `row-${idx}`,
    text: item?.texte || item?.text || item?.message || 'Notification',
    createdAt: item?.createdAt || item?.date || null,
    read: Boolean(item?.lu ?? item?.read ?? item?.isRead),
  })), [data]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleMarkAll = async () => {
    if (!user?.id || notifications.length === 0) return;
    setUpdatingId('all');
    setStatus(null);
    try {
      await markAllNotificationsRead(user.id);
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de mettre à jour les notifications.';
      setStatus({ type: 'error', message });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkOne = async (notification) => {
    if (!notification?.id || notification.read) return;
    setUpdatingId(notification.id);
    setStatus(null);
    try {
      await markNotificationRead(notification.id);
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Action impossible.';
      setStatus({ type: 'error', message });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>
            <FaBell size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
            Notifications
            {unread > 0 && (
              <span style={{ background: 'var(--red-primary)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginLeft: 8 }}>
                {unread}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button style={{ background: 'none', border: 'none', color: 'var(--red-primary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              onClick={handleMarkAll} disabled={updatingId === 'all' || unread === 0}>
              <FaCheckDouble size={12} /> {updatingId === 'all' ? 'Traitement…' : 'Tout marquer comme lu'}
            </button>
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {status && (
          <div style={{ color: 'var(--red-primary)', fontSize: 12, marginBottom: 12 }}>{status.message}</div>
        )}
        {error && (
          <div style={{ color: 'var(--red-primary)', fontSize: 12, marginBottom: 12 }}>Impossible de récupérer les notifications.</div>
        )}

        {notifications.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '20px 0' }}>Aucune notification.</div>
        )}

        {notifications.map((n) => (
          <div className="notification-item" key={n.id} style={{ background: n.read ? 'transparent' : 'var(--pink-ultra-light)', borderRadius: 8, marginBottom: 4 }}>
            <div className={`notification-dot ${n.read ? 'read' : ''}`} />
            <div style={{ flex: 1 }}>
              <p className="notification-text" style={{ fontWeight: n.read ? 400 : 600 }}>{n.text}</p>
              <p className="notification-time">{formatTime(n.createdAt)}</p>
            </div>
            {n.read ? (
              <FaBellSlash size={13} color="var(--pink-light)" />
            ) : (
              <button type="button" onClick={() => handleMarkOne(n)} disabled={updatingId === n.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <FaBell size={13} color="var(--red-primary)" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Notifications;
