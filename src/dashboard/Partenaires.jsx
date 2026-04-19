import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FaHandshake, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff,
  FaImage, FaSyncAlt, FaTimes, FaSave,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import {
  listPartenaires, createPartenaire, updatePartenaire, deletePartenaire,
} from '../services/partenaires';

/* ── helpers ─────────────────────────────────────────────────── */

const DEFAULT_FORM = { nom: '', description: '', logo: null, logoPreview: null };

function PartenaireModal({ initial, onSave, onClose, saving }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    nom: initial?.nom || '',
    description: initial?.description || '',
    logo: null,
    logoPreview: initial?.logoUrl || null,
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((p) => ({
      ...p,
      logo: file,
      logoPreview: file ? URL.createObjectURL(file) : p.logoPreview,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ nom: form.nom, description: form.description, logo: form.logo });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 14, padding: '28px 24px',
        width: '100%', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {isEdit ? 'Modifier le partenaire' : 'Nouveau partenaire'}
          </h3>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18 }}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p className="settings-label">Nom *</p>
            <input
              className="form-input"
              placeholder="Nom du partenaire"
              value={form.nom}
              onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
              required
              maxLength={100}
            />
          </div>

          <div>
            <p className="settings-label">Description</p>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Courte description du partenaire…"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              maxLength={500}
            />
          </div>

          <div>
            <p className="settings-label">Logo</p>
            {form.logoPreview && (
              <div style={{ marginBottom: 8 }}>
                <img
                  src={form.logoPreview}
                  alt="Aperçu logo"
                  style={{ height: 60, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              background: 'var(--pink-very-light)', border: '1px dashed var(--pink-light)',
              borderRadius: 8, padding: '10px 16px', fontSize: 13, color: 'var(--text-gray)',
            }}>
              <FaImage size={14} />
              {form.logo ? form.logo.name : 'Choisir un fichier…'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13 }}>
              Annuler
            </button>
            <button type="submit" className="btn-add"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              disabled={saving || !form.nom.trim()}>
              <FaSave size={13} />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────── */

function Partenaires() {
  const { roles } = useAuth();

  useEffect(() => {
    // DEBUG — à retirer après vérification
    const token = localStorage.getItem('rsc_token');
    console.log('[Partenaires] rôles frontend:', roles);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[Partenaires] JWT payload:', payload);
      } catch { /* ignore */ }
    }
  }, [roles]);

  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', data?: partenaire }
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPartenaires();
      setPartenaires(Array.isArray(data) ? data : (data?.content || []));
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de charger les partenaires.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async ({ nom, description, logo }) => {
    setSaving(true);
    setActionStatus(null);
    try {
      if (modal?.mode === 'edit' && modal.data?.id) {
        await updatePartenaire(modal.data.id, { nom, description, logo });
        setActionStatus({ type: 'success', message: 'Partenaire mis à jour.' });
      } else {
        await createPartenaire({ nom, description, logo });
        setActionStatus({ type: 'success', message: 'Partenaire créé.' });
      }
      setModal(null);
      await load();
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message
        || err?.response?.data?.error
        || (typeof err?.response?.data === 'string' ? err.response.data : null)
        || (err?.message?.toLowerCase().includes('network') ? 'Erreur réseau — CORS ou backend inaccessible.' : null)
        || err?.message
        || 'Opération impossible.';
      setActionStatus({ type: 'error', message: status ? `[${status}] ${msg}` : msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Supprimer le partenaire « ${p.nom} » ?`)) return;
    setDeletingId(p.id);
    setActionStatus(null);
    try {
      await deletePartenaire(p.id);
      setActionStatus({ type: 'success', message: 'Partenaire supprimé.' });
      await load();
    } catch (err) {
      setActionStatus({ type: 'error', message: err?.response?.data?.message || 'Suppression impossible.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <h3 className="content-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaHandshake size={16} color="var(--red-primary)" />
            Partenaires
            <span style={{ background: 'var(--pink-light)', color: 'var(--text-dark)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, marginLeft: 4 }}>
              {partenaires.length}
            </span>
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-small" type="button" onClick={load} disabled={loading}>
              <FaSyncAlt size={11} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
            <button
              type="button"
              className="btn-add"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', fontSize: 13 }}
              onClick={() => setModal({ mode: 'create' })}
            >
              <FaPlus size={12} />
              Nouveau partenaire
            </button>
          </div>
        </div>

        {/* Message status */}
        {actionStatus && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: actionStatus.type === 'success' ? 'rgba(46,125,50,0.12)' : 'rgba(198,40,40,0.12)',
            color: actionStatus.type === 'success' ? '#2e7d32' : '#c62828',
          }}>
            {actionStatus.message}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red-primary)', fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        {/* Liste vide */}
        {!loading && partenaires.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-gray)' }}>
            <FaHandshake size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Aucun partenaire enregistré.</p>
          </div>
        )}

        {/* Grille de cartes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {partenaires.map((p) => (
            <div
              key={p.id}
              style={{
                border: '1px solid var(--border-light, #e8e8e8)',
                borderRadius: 12,
                overflow: 'hidden',
                background: p.actif ? 'white' : '#fafafa',
                opacity: p.actif ? 1 : 0.7,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Logo */}
              <div style={{
                height: 100,
                background: 'var(--pink-ultra-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid var(--border-light, #f0f0f0)',
              }}>
                {p.logoUrl ? (
                  <img
                    src={p.logoUrl}
                    alt={p.nom}
                    style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.replaceWith(Object.assign(document.createElement('div'), { innerHTML: '🤝', style: 'font-size:40px' })); }}
                  />
                ) : (
                  <FaHandshake size={36} color="var(--pink-card)" />
                )}
              </div>

              {/* Corps */}
              <div style={{ padding: '14px 16px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, flex: 1 }}>{p.nom}</p>
                  {p.actif ? (
                    <FaToggleOn size={18} color="#2e7d32" title="Actif" />
                  ) : (
                    <FaToggleOff size={18} color="#9e9e9e" title="Inactif" />
                  )}
                </div>
                {p.description && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-gray)', lineHeight: 1.6 }}>
                    {p.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: 8,
                padding: '10px 16px',
                borderTop: '1px solid var(--border-light, #f0f0f0)',
                background: 'var(--pink-ultra-light)',
              }}>
                <button
                  type="button"
                  className="btn-small"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => setModal({ mode: 'edit', data: p })}
                >
                  <FaEdit size={11} /> Modifier
                </button>
                <button
                  type="button"
                  className="btn-small"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#c62828', borderColor: '#c62828' }}
                  onClick={() => handleDelete(p)}
                  disabled={deletingId === p.id}
                >
                  <FaTrash size={11} />
                  {deletingId === p.id ? '…' : 'Supprimer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal création / édition */}
      {modal && (
        <PartenaireModal
          initial={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

export default Partenaires;
