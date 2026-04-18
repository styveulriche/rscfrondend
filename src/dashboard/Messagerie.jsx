import { useState, useEffect, useCallback } from 'react';
import {
  FaEnvelopeOpen, FaHeadset, FaPaperPlane,
  FaChevronDown, FaChevronUp, FaUser, FaUserShield, FaSyncAlt,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  createSupportTicket, listMyTickets, getMyTicketDetail, replyToMyTicket,
  listAllTickets, getTicketDetail, updateTicketStatus, adminReplyToTicket, assignTicket,
} from '../services/messages';
import { sendNotification } from '../services/notifications';

/* ── helpers ───────────────────────────────────────────────── */

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const formatTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const STATUT_CONFIG = {
  OUVERT:   { label: 'Ouvert',   color: '#1976d2', bg: 'rgba(25,118,210,0.1)' },
  EN_COURS: { label: 'En cours', color: '#f57c00', bg: 'rgba(245,124,0,0.1)' },
  RESOLU:   { label: 'Résolu',   color: '#2e7d32', bg: 'rgba(46,125,50,0.1)' },
  FERME:    { label: 'Fermé',    color: '#616161', bg: 'rgba(97,97,97,0.1)' },
};

const URGENCE_CONFIG = {
  FAIBLE:   { label: 'Faible',   color: '#757575' },
  NORMAL:   { label: 'Normal',   color: '#1976d2' },
  HAUTE:    { label: 'Haute',    color: '#f57c00' },
  CRITIQUE: { label: 'Critique', color: '#c62828' },
};

function StatusBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut] || { label: statut, color: '#616161', bg: 'rgba(97,97,97,0.1)' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

/* ── Thread d'un ticket (commun admin/user) ─────────────────── */

function TicketThread({ detail, isAdmin: isAdminView, onReply, replyText, onReplyChange, replying, replyError, onStatusChange, statusChanging }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-color, #e8e8e8)', padding: 16 }}>
      {/* Message initial */}
      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)', marginBottom: 4 }}>
          <FaUser size={10} style={{ marginRight: 4 }} />
          {detail.utilisateurNom || detail.utilisateurEmail || 'Utilisateur'} — {formatTime(detail.dateCreation)}
        </p>
        <p style={{ margin: 0, fontSize: 13 }}>{detail.contenu}</p>
      </div>

      {/* Réponses */}
      {(detail.reponses || []).map((rep) => (
        <div
          key={rep.id}
          style={{
            marginBottom: 10,
            padding: '10px 14px',
            borderRadius: 8,
            background: rep.expediteurType === 'ADMIN' ? 'rgba(139,28,28,0.06)' : 'rgba(0,0,0,0.03)',
            borderLeft: rep.expediteurType === 'ADMIN' ? '3px solid var(--red-primary)' : '3px solid #e0e0e0',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)', marginBottom: 4 }}>
            {rep.expediteurType === 'ADMIN'
              ? <FaUserShield size={10} style={{ marginRight: 4 }} />
              : <FaUser size={10} style={{ marginRight: 4 }} />}
            {rep.expediteurType === 'ADMIN' ? (rep.expediteurNom || 'Support RSC') : (rep.expediteurNom || 'Vous')}
            {' '}— {formatTime(rep.dateEnvoi)}
            {!rep.lu && <span style={{ marginLeft: 8, color: 'var(--red-primary)', fontWeight: 700 }}>●</span>}
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>{rep.contenu}</p>
        </div>
      ))}

      {/* Actions statut — admin seulement */}
      {isAdminView && detail.statut !== 'FERME' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          {detail.statut !== 'EN_COURS' && (
            <button type="button" className="btn-small" onClick={() => onStatusChange('EN_COURS')} disabled={statusChanging}>
              Marquer En cours
            </button>
          )}
          {detail.statut !== 'RESOLU' && (
            <button type="button" className="btn-small" onClick={() => onStatusChange('RESOLU')} disabled={statusChanging}>
              Marquer Résolu
            </button>
          )}
          <button
            type="button"
            className="btn-small"
            style={{ color: '#616161' }}
            onClick={() => onStatusChange('FERME')}
            disabled={statusChanging}
          >
            Fermer le ticket
          </button>
        </div>
      )}

      {/* Formulaire de réponse */}
      {detail.statut !== 'FERME' ? (
        <form onSubmit={onReply} style={{ marginTop: 8 }}>
          <textarea
            className="form-input"
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
            placeholder={isAdminView ? 'Répondre directement à l\'utilisateur via notification…' : 'Ajouter une précision…'}
            value={replyText}
            onChange={onReplyChange}
          />
          {replyError && (
            <p style={{ color: '#c62828', fontSize: 12, marginBottom: 8 }}>{replyError}</p>
          )}
          <button
            type="submit"
            className="btn-add"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            disabled={replying || !replyText.trim()}
          >
            <FaPaperPlane size={12} />
            {replying ? 'Envoi de la notification…' : 'Répondre'}
          </button>
        </form>
      ) : (
        <p style={{ color: '#616161', fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>Ce ticket est fermé.</p>
      )}
    </div>
  );
}

/* ── Vue Admin ─────────────────────────────────────────────── */

const STATUS_TABS = [
  { value: '', label: 'Tous' },
  { value: 'OUVERT', label: 'Ouverts' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'RESOLU', label: 'Résolus' },
  { value: 'FERME', label: 'Fermés' },
];

export function AdminMessagerieView() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 0, size: 50 };
      if (statusFilter) params.statut = statusFilter;
      const data = await listAllTickets(params);
      setTickets(normalizeList(data));
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de charger les tickets.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSelect = async (id) => {
    if (selectedId === id) { setSelectedId(null); setDetail(null); return; }
    setSelectedId(id);
    setReplyText('');
    // Afficher immédiatement les données de la liste (fallback garanti)
    const fromList = tickets.find((t) => t.id === id) || null;
    setDetail(fromList);
    setDetailLoading(true);
    try {
      const data = await getTicketDetail(id);
      setDetail(data);
    } catch {
      // on garde le fallback de la liste déjà chargé
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedId || !detail?.utilisateurId) return;
    setReplying(true);
    setReplyError(null);
    try {
      // Action principale : envoyer une notification directement à l'utilisateur
      await sendNotification({
        titre: `Réponse à votre ticket : ${detail.sujet}`,
        message: replyText.trim().slice(0, 500),
        type: 'INFO',
        priorite: 'NORMAL',
        filtre: {
          tous: false,
          utilisateurIds: [detail.utilisateurId],
        },
      });

      // Action secondaire : enregistrer dans le fil du ticket (silencieux si indisponible)
      try {
        const updated = await adminReplyToTicket(selectedId, replyText.trim());
        setDetail(updated);
      } catch { /* non bloquant */ }

      setReplyText('');
      loadTickets();
    } catch (err) {
      setReplyError(err?.response?.data?.message || 'Impossible d\'envoyer la notification.');
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (statut) => {
    if (!selectedId) return;
    setStatusChanging(true);
    try {
      const updated = await updateTicketStatus(selectedId, statut);
      setDetail(updated);
      loadTickets();
    } catch { /* silent */ } finally {
      setStatusChanging(false);
    }
  };

  const handleAssign = async (ticketId) => {
    if (!user?.id) return;
    setAssigning(true);
    try {
      const updated = await assignTicket(ticketId, user.id);
      if (selectedId === ticketId) setDetail(updated);
      loadTickets();
    } catch { /* silent */ } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <StatsRow />
      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="content-card-title" style={{ margin: 0 }}>
            <FaHeadset size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
            Tickets support
          </h3>
          <button className="btn-small" type="button" onClick={loadTickets} disabled={loading}>
            <FaSyncAlt size={11} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        </div>

        {/* Filtres statut */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setStatusFilter(value); setSelectedId(null); setDetail(null); }}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                border: '1px solid',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: statusFilter === value ? 700 : 400,
                borderColor: statusFilter === value ? 'var(--red-primary)' : 'var(--border-color, #e0e0e0)',
                background: statusFilter === value ? 'var(--red-primary)' : 'transparent',
                color: statusFilter === value ? 'white' : 'var(--text-gray)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p style={{ color: 'var(--red-primary)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {!loading && tickets.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '30px 0' }}>
            Aucun ticket trouvé.
          </div>
        )}

        {tickets.map((ticket) => {
          const isOpen = selectedId === ticket.id;
          const urgenceCfg = URGENCE_CONFIG[ticket.niveauUrgence];
          return (
            <div
              key={ticket.id}
              style={{ borderRadius: 8, border: '1px solid var(--border-color, #e8e8e8)', marginBottom: 10, overflow: 'hidden' }}
            >
              {/* En-tête cliquable */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(ticket.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(ticket.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: isOpen ? 'rgba(139,28,28,0.04)' : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{ticket.sujet}</p>
                    <StatusBadge statut={ticket.statut} />
                    {urgenceCfg && ticket.niveauUrgence !== 'NORMAL' && (
                      <span style={{ fontSize: 11, color: urgenceCfg.color, fontWeight: 600 }}>
                        ● {ticket.niveauUrgenceLibelle || urgenceCfg.label}
                      </span>
                    )}
                    {ticket.reponsesNonLues > 0 && (
                      <span style={{
                        background: 'var(--red-primary)', color: 'white',
                        borderRadius: '50%', width: 18, height: 18,
                        fontSize: 10, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {ticket.reponsesNonLues}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-gray)' }}>
                    <FaUser size={10} style={{ marginRight: 4 }} />
                    {ticket.utilisateurNom || ticket.utilisateurEmail || 'Utilisateur'}
                    {ticket.adminAssigneNom && (
                      <span style={{ marginLeft: 12 }}>
                        <FaUserShield size={10} style={{ marginRight: 4 }} />
                        {ticket.adminAssigneNom}
                      </span>
                    )}
                    <span style={{ marginLeft: 12 }}>{formatTime(ticket.dateCreation)}</span>
                  </p>
                </div>
                {!ticket.adminAssigneNom && ticket.statut !== 'FERME' && (
                  <button
                    type="button"
                    className="btn-small"
                    style={{ flexShrink: 0, fontSize: 11, padding: '4px 10px' }}
                    onClick={(e) => { e.stopPropagation(); handleAssign(ticket.id); }}
                    disabled={assigning}
                  >
                    <FaUserShield size={10} style={{ marginRight: 4 }} />
                    S'assigner
                  </button>
                )}
                {isOpen ? <FaChevronUp size={12} color="var(--text-gray)" /> : <FaChevronDown size={12} color="var(--text-gray)" />}
              </div>

              {/* Détail expandé */}
              {isOpen && detail && (
                <TicketThread
                  detail={detail}
                  isAdmin
                  onReply={handleReply}
                  replyText={replyText}
                  onReplyChange={(e) => { setReplyText(e.target.value); setReplyError(null); }}
                  replying={replying}
                  replyError={replyError}
                  onStatusChange={handleStatusChange}
                  statusChanging={statusChanging}
                />
              )}
              {isOpen && !detail && detailLoading && (
                <p style={{ padding: '12px 16px', color: 'var(--text-gray)', fontSize: 13 }}>Chargement…</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Vue Utilisateur ────────────────────────────────────────── */

const DEFAULT_COMPOSE = { sujet: '', contenu: '', niveauUrgence: 'NORMAL' };

export function UserMessagerieView() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [compose, setCompose] = useState({ ...DEFAULT_COMPOSE });
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!user?.id) return;
    setTicketsLoading(true);
    try {
      const data = await listMyTickets({ page: 0, size: 20 });
      setTickets(normalizeList(data));
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!compose.sujet.trim() || !compose.contenu.trim()) {
      setSendStatus({ type: 'error', message: 'Veuillez remplir le sujet et le message.' });
      return;
    }
    setSending(true);
    setSendStatus(null);
    try {
      await createSupportTicket({
        sujet: compose.sujet.trim(),
        contenu: compose.contenu.trim(),
        niveauUrgence: compose.niveauUrgence,
      });
      setCompose({ ...DEFAULT_COMPOSE });
      setSendStatus({ type: 'success', message: 'Votre ticket a été créé. Notre équipe vous répondra bientôt.' });
      loadTickets();
    } catch (err) {
      setSendStatus({ type: 'error', message: err?.response?.data?.message || 'Impossible d\'envoyer le message.' });
    } finally {
      setSending(false);
    }
  };

  const handleSelectTicket = async (id) => {
    if (selectedId === id) { setSelectedId(null); setDetail(null); return; }
    setSelectedId(id);
    setReplyText('');
    setDetailLoading(true);
    try {
      const data = await getMyTicketDetail(id);
      setDetail(data);
    } catch {
      // fallback sur les données de la liste
      const ticket = tickets.find((t) => t.id === id);
      setDetail(ticket || null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedId) return;
    setReplying(true);
    try {
      const updated = await replyToMyTicket(selectedId, replyText.trim());
      setDetail(updated);
      setReplyText('');
      loadTickets();
    } catch { /* silent */ } finally {
      setReplying(false);
    }
  };

  return (
    <div>
      <StatsRow />

      {/* Mes tickets existants */}
      {tickets.length > 0 && (
        <div className="content-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="content-card-title" style={{ margin: 0 }}>
              <FaEnvelopeOpen size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
              Mes tickets
            </h3>
            <button className="btn-small" type="button" onClick={loadTickets} disabled={ticketsLoading}>
              {ticketsLoading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>

          {tickets.map((ticket) => {
            const isOpen = selectedId === ticket.id;
            return (
              <div
                key={ticket.id}
                style={{ borderRadius: 8, border: '1px solid var(--border-color, #e8e8e8)', marginBottom: 10, overflow: 'hidden' }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTicket(ticket.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTicket(ticket.id)}
                  style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{ticket.sujet}</p>
                      <StatusBadge statut={ticket.statut} />
                      {ticket.reponsesNonLues > 0 && (
                        <span style={{
                          background: 'var(--red-primary)', color: 'white',
                          borderRadius: '50%', width: 18, height: 18,
                          fontSize: 10, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {ticket.reponsesNonLues}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-gray)' }}>
                      {formatTime(ticket.dateCreation)}
                      {ticket.adminAssigneNom && (
                        <span style={{ marginLeft: 10 }}>
                          <FaUserShield size={10} style={{ marginRight: 4 }} />
                          {ticket.adminAssigneNom}
                        </span>
                      )}
                    </p>
                  </div>
                  {isOpen ? <FaChevronUp size={12} color="var(--text-gray)" /> : <FaChevronDown size={12} color="var(--text-gray)" />}
                </div>

                {isOpen && (
                  detailLoading
                    ? <p style={{ padding: '12px 16px', color: 'var(--text-gray)', fontSize: 13 }}>Chargement…</p>
                    : detail
                      ? (
                        <TicketThread
                          detail={detail}
                          isAdmin={false}
                          onReply={handleReply}
                          replyText={replyText}
                          onReplyChange={(e) => setReplyText(e.target.value)}
                          replying={replying}
                          onStatusChange={null}
                          statusChanging={false}
                        />
                      )
                      : null
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nouveau ticket */}
      <div className="content-card">
        <h3 className="content-card-title" style={{ marginBottom: 4 }}>
          <FaHeadset size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
          Contacter le support
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-gray)', marginBottom: 16 }}>
          Un problème ou une question ? Envoyez un message à notre équipe d'administration.
        </p>

        <form onSubmit={handleSend}>
          <div style={{ marginBottom: 12 }}>
            <p className="settings-label">Sujet</p>
            <input
              className="form-input"
              value={compose.sujet}
              onChange={(e) => setCompose((prev) => ({ ...prev, sujet: e.target.value }))}
              placeholder="Ex : Problème de paiement, Question sur mon compte…"
              maxLength={150}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <p className="settings-label">Niveau d'urgence</p>
            <select
              className="form-input"
              value={compose.niveauUrgence}
              onChange={(e) => setCompose((prev) => ({ ...prev, niveauUrgence: e.target.value }))}
            >
              <option value="FAIBLE">Faible</option>
              <option value="NORMAL">Normal</option>
              <option value="HAUTE">Haute</option>
              <option value="CRITIQUE">Critique</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <p className="settings-label">Message</p>
            <textarea
              className="form-input"
              rows={4}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              value={compose.contenu}
              onChange={(e) => setCompose((prev) => ({ ...prev, contenu: e.target.value }))}
              placeholder="Décrivez votre problème en détail…"
              maxLength={2000}
            />
            <p style={{ fontSize: 11, color: 'var(--text-gray)', marginTop: 4, textAlign: 'right' }}>
              {compose.contenu.length}/2000
            </p>
          </div>

          {sendStatus && (
            <div style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: sendStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: sendStatus.type === 'success' ? '#2e7d32' : '#c62828',
            }}>
              {sendStatus.message}
            </div>
          )}

          <button type="submit" className="btn-add" style={{ display: 'flex', alignItems: 'center', gap: 8 }} disabled={sending}>
            <FaPaperPlane size={13} />
            {sending ? 'Envoi…' : 'Envoyer au support'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Composant principal ─────────────────────────────────────── */

function Messagerie() {
  const { hasRole, isSuperAdmin } = useAuth();
  return (isSuperAdmin || hasRole(['SUPER_ADMIN', 'ADMIN_SUPPORT'])) ? <AdminMessagerieView /> : <UserMessagerieView />;
}

export default Messagerie;
