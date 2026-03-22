import { useState, useMemo, useCallback } from 'react';
import { FaBell, FaBellSlash, FaCheckDouble, FaPaperPlane, FaSearch, FaTrash } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  previewNotificationRecipients,
  sendNotification,
} from '../services/notifications';
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

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'Tous les utilisateurs' },
  { value: 'FILTERED', label: 'Filtrer par statut' },
  { value: 'CUSTOM', label: 'IDs spécifiques (UUID)' },
];

const ACCOUNT_STATUS_OPTIONS = [
  { value: '', label: '-- Statut de compte --' },
  { value: 'ACTIF', label: 'Actif' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_VERIFICATION', label: 'En vérification' },
  { value: 'SUSPENDU', label: 'Suspendu' },
  { value: 'INACTIF', label: 'Inactif' },
];

const DIASPORA_STATUS_OPTIONS = [
  { value: '', label: '-- Statut diaspora --' },
  { value: 'RESIDENT_PERMANENT', label: 'Résident permanent' },
  { value: 'CITOYEN_CANADIEN', label: 'Citoyen canadien' },
  { value: 'ETUDIANT_INTERNATIONAL', label: 'Étudiant international' },
  { value: 'TRAVAILLEUR_TEMPORAIRE', label: 'Travailleur temporaire' },
  { value: 'VISITEUR_LONG_SEJOUR', label: 'Visiteur long séjour' },
  { value: 'REFUGIE', label: 'Réfugié' },
];

const DEFAULT_COMPOSER = {
  title: '',
  message: '',
  audience: 'ALL',
  accountStatus: '',
  diasporaStatus: '',
  identifiers: '',
  type: 'INFO',
  priority: 'NORMAL',
  actionUrl: '',
};

const TYPE_OPTIONS = [
  { value: 'INFO', label: 'Information' },
  { value: 'ALERTE', label: 'Alerte' },
  { value: 'SUCCESS', label: 'Succès' },
  { value: 'AVERTISSEMENT', label: 'Avertissement' },
  { value: 'RAPPEL', label: 'Rappel' },
  { value: 'ERREUR', label: 'Erreur' },
];

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: 'Normale' },
  { value: 'HAUTE', label: 'Haute' },
  { value: 'CRITIQUE', label: 'Critique' },
];

const parseList = (value) => (value || '')
  .split(/\r?\n|,|;/)
  .map((item) => item.trim())
  .filter(Boolean);

function Notifications() {
  const { user, hasRole } = useAuth();
  const [status, setStatus] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [composer, setComposer] = useState(() => ({ ...DEFAULT_COMPOSER }));
  const [composerStatus, setComposerStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [previewState, setPreviewState] = useState({ loading: false, recipients: [], error: null });

  const canSendNotifications = hasRole(['SUPER_ADMIN', 'ADMIN_SUPPORT', 'ADMIN_CONTENU', 'SUPPORT']);

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    return listNotifications({ page: 0, size: 20 });
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
    titre: item?.titre || 'Notification',
    message: item?.message || '',
    type: item?.type || '',
    typeLibelle: item?.typeLibelle || item?.type || '',
    typeCouleur: item?.typeCouleur || null,
    priorite: item?.priorite || '',
    dateEnvoi: item?.dateEnvoi || null,
    actionUrl: item?.actionUrl || null,
    read: Boolean(item?.lu),
  })), [data]);

  const unread = notifications.filter((n) => !n.read).length;

  const parseIds = useCallback(() => parseList(composer.identifiers), [composer.identifiers]);

  const buildFilterPayload = useCallback(() => {
    const ids = parseIds();
    return {
      tous: composer.audience === 'ALL',
      statutCompte: composer.audience === 'FILTERED' && composer.accountStatus ? composer.accountStatus : undefined,
      statutDiaspora: composer.audience === 'FILTERED' && composer.diasporaStatus ? composer.diasporaStatus : undefined,
      utilisateurIds: composer.audience === 'CUSTOM' && ids.length ? ids : undefined,
    };
  }, [composer.audience, composer.accountStatus, composer.diasporaStatus, parseIds]);

  const hasTarget = useCallback((filters) => (
    Boolean(filters.tous)
    || Boolean(filters.statutCompte)
    || Boolean(filters.statutDiaspora)
    || (Array.isArray(filters.utilisateurIds) && filters.utilisateurIds.length > 0)
  ), []);

  const handleSendNotification = async (event) => {
    event.preventDefault();
    if (!composer.title.trim() || !composer.message.trim()) {
      setComposerStatus({ type: 'error', message: 'Le titre et le message sont requis.' });
      return;
    }
    const filters = buildFilterPayload();
    if (!hasTarget(filters)) {
      setComposerStatus({ type: 'error', message: 'Sélectionnez une audience ou des filtres valides.' });
      return;
    }

    const payload = {
      titre: composer.title.trim(),
      message: composer.message.trim(),
      type: composer.type,
      priorite: composer.priority,
      actionUrl: composer.actionUrl || undefined,
      filtre: filters,
    };

    setSending(true);
    setComposerStatus(null);
    try {
      await sendNotification(payload);
      setComposer({ ...DEFAULT_COMPOSER });
      setPreviewState({ loading: false, recipients: [], error: null });
      setComposerStatus({ type: 'success', message: 'Notification envoyée.' });
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible d\'envoyer la notification.';
      setComposerStatus({ type: 'error', message });
    } finally {
      setSending(false);
    }
  };

  const handlePreviewRecipients = async () => {
    const filters = buildFilterPayload();
    if (!hasTarget(filters)) {
      setPreviewState({ loading: false, recipients: [], error: 'Configurez au moins un filtre ou choisissez "Tous".' });
      return;
    }
    setPreviewState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const recipients = await previewNotificationRecipients(filters);
      setPreviewState({ loading: false, recipients: Array.isArray(recipients) ? recipients : [], error: null });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Prévisualisation impossible.';
      setPreviewState({ loading: false, recipients: [], error: message });
    }
  };

  const handleMarkAll = async () => {
    if (notifications.length === 0) return;
    setUpdatingId('all');
    setStatus(null);
    try {
      await markAllNotificationsRead();
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

  const handleDelete = async (notification) => {
    if (!notification?.id) return;
    setUpdatingId(`delete-${notification.id}`);
    setStatus(null);
    try {
      await deleteNotification(notification.id);
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Suppression impossible.';
      setStatus({ type: 'error', message });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <StatsRow />

      {canSendNotifications && (
        <div className="content-card" style={{ marginBottom: 20 }}>
          <h3 className="content-card-title" style={{ marginBottom: 10 }}>Envoyer une notification</h3>
          <form onSubmit={handleSendNotification}>
            <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <p className="settings-label">Titre</p>
                <input
                  className="form-input"
                  placeholder="Titre de la notification"
                  value={composer.title}
                  onChange={(e) => setComposer((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <p className="settings-label">Type</p>
                <select
                  className="form-input"
                  value={composer.type}
                  onChange={(e) => setComposer((prev) => ({ ...prev, type: e.target.value }))}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="settings-label">Priorité</p>
                <select
                  className="form-input"
                  value={composer.priority}
                  onChange={(e) => setComposer((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="settings-label">Audience</p>
                <select
                  className="form-input"
                  value={composer.audience}
                  onChange={(e) => setComposer((prev) => ({ ...prev, audience: e.target.value }))}
                >
                  {AUDIENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              {composer.audience === 'FILTERED' && (
                <>
                  <div>
                    <p className="settings-label">Statut de compte</p>
                    <select
                      className="form-input"
                      value={composer.accountStatus}
                      onChange={(e) => setComposer((prev) => ({ ...prev, accountStatus: e.target.value }))}
                    >
                      {ACCOUNT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="settings-label">Statut diaspora</p>
                    <select
                      className="form-input"
                      value={composer.diasporaStatus}
                      onChange={(e) => setComposer((prev) => ({ ...prev, diasporaStatus: e.target.value }))}
                    >
                      {DIASPORA_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {composer.audience === 'CUSTOM' && (
              <div style={{ marginTop: 12 }}>
                <p className="settings-label">Identifiants utilisateurs (UUID, séparés par virgule ou retour à la ligne)</p>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="uuid-1, uuid-2"
                  value={composer.identifiers}
                  onChange={(e) => setComposer((prev) => ({ ...prev, identifiers: e.target.value }))}
                />
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <p className="settings-label">Message</p>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Contenu de la notification"
                value={composer.message}
                onChange={(e) => setComposer((prev) => ({ ...prev, message: e.target.value }))}
                required
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <p className="settings-label">Lien d'action (optionnel)</p>
              <input
                className="form-input"
                placeholder="https://exemple.com"
                value={composer.actionUrl}
                onChange={(e) => setComposer((prev) => ({ ...prev, actionUrl: e.target.value }))}
              />
            </div>

            {composerStatus && (
              <div style={{
                margin: '12px 0',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                background: composerStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
                color: composerStatus.type === 'success' ? '#2e7d32' : '#c62828',
              }}>
                {composerStatus.message}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              <button
                type="button"
                onClick={handlePreviewRecipients}
                disabled={previewState.loading}
                style={{
                  border: '1px solid var(--pink-light)',
                  background: 'white',
                  color: 'var(--red-primary)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FaSearch size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {previewState.loading ? 'Prévisualisation…' : 'Prévisualiser les destinataires'}
              </button>
              <button type="submit" className="btn-add" disabled={sending}>
                <FaPaperPlane size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {sending ? 'Envoi…' : 'Envoyer la notification'}
              </button>
            </div>
          </form>

          {(previewState.error || previewState.recipients.length > 0) && (
            <div style={{ marginTop: 16 }}>
              <p className="settings-label" style={{ marginBottom: 6 }}>Destinataires prévus</p>
              {previewState.error && (
                <div style={{ color: 'var(--red-primary)', fontSize: 13 }}>{previewState.error}</div>
              )}
              {!previewState.error && previewState.recipients.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-gray)' }}>Aucun destinataire ne correspond à ces filtres.</div>
              )}
              {previewState.recipients.length > 0 && (
                <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Nom</th>
                        <th style={{ padding: '8px 10px' }}>Email</th>
                        <th style={{ padding: '8px 10px' }}>Statut compte</th>
                        <th style={{ padding: '8px 10px' }}>Statut diaspora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewState.recipients.map((recipient) => (
                        <tr key={recipient.id} style={{ borderTop: '1px solid #f1f1f1' }}>
                          <td style={{ padding: '6px 10px' }}>{`${recipient.prenom || ''} ${recipient.nom || ''}`.trim() || recipient.username || recipient.email}</td>
                          <td style={{ padding: '6px 10px' }}>{recipient.email || '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{recipient.statutCompte || '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{recipient.statutDiaspora || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
              <p className="notification-text" style={{ fontWeight: n.read ? 400 : 600, margin: 0 }}>{n.titre}</p>
              {n.message && (
                <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '2px 0 0' }}>{n.message}</p>
              )}
              <p className="notification-time">{formatTime(n.dateEnvoi)}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {n.read ? (
                <FaBellSlash size={13} color="var(--pink-light)" />
              ) : (
                <button type="button" onClick={() => handleMarkOne(n)} disabled={updatingId === n.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <FaBell size={13} color="var(--red-primary)" />
                </button>
              )}
              <button type="button" onClick={() => handleDelete(n)} disabled={updatingId === `delete-${n.id}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <FaTrash size={12} color="var(--pink-light)" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Notifications;
