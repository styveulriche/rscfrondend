import { useState, useCallback, useEffect, useRef } from 'react';
import {
  FaNewspaper, FaHeartBroken, FaPlus, FaEdit, FaTrash,
  FaCalendarAlt, FaMapMarkerAlt, FaGlobe, FaTimes, FaCheck,
  FaUpload, FaImage, FaArchive,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { listDeclarations } from '../services/declarations';
import {
  listAdminArticles, createArticle, updateArticle,
  deleteArticle, publishArticle, archiveArticle,
} from '../services/articles';

/* ─── helpers ──────────────────────────────────────────────── */

const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.content)) return p.content;
  if (Array.isArray(p?.items)) return p.items;
  return [];
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' });
};

const CATEGORIES = ['Actualité', 'Communiqué', 'Événement', 'Conseil', 'Autre'];

/* ─── badge statut déclaration ─────────────────────────────── */
const declColor = (v) => {
  const n = v?.toUpperCase();
  if (n === 'TRAITE' || n === 'CLOTURE') return '#2e7d32';
  if (n === 'EN_COURS') return '#1565c0';
  if (n === 'REJETE' || n === 'ANNULE') return '#c62828';
  return '#f57c00';
};

const declLabel = (v) => {
  const m = { DECLARE: 'Déclarée', EN_COURS: 'En cours', TRAITE: 'Traitée', CLOTURE: 'Clôturée', REJETE: 'Rejetée', ANNULE: 'Annulée' };
  return m[v?.toUpperCase()] || v || '—';
};

/* ─── formulaire article (admin) ───────────────────────────── */
const EMPTY_FORM = { titre: '', resume: '', contenu: '', categorie: 'Actualité', image: null };

function ImagePicker({ existingUrl, value, onChange }) {
  const [filePreview, setFilePreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Fichier trop volumineux (max 5 Mo).'); return; }
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(URL.createObjectURL(file));
    onChange(file);
  };

  const clear = () => {
    if (filePreview) { URL.revokeObjectURL(filePreview); setFilePreview(null); }
    onChange(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const preview = filePreview || (value instanceof File ? null : existingUrl) || null;

  return (
    <div style={{ marginBottom: 14, border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: 'var(--pink-ultra-light)' }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: 'white', border: '2px dashed var(--border-light)',
            borderRadius: 8, padding: '11px 16px', cursor: 'pointer',
            color: 'var(--text-gray)', fontSize: 13, fontWeight: 600,
            justifyContent: 'center', transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red-primary)'; e.currentTarget.style.color = 'var(--red-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-gray)'; }}>
          <FaUpload size={13} />
          {value instanceof File ? value.name : 'Choisir une image (JPG, PNG, WebP — max 5 Mo)'}
        </button>
        {value instanceof File && (
          <p style={{ margin: '5px 0 0', fontSize: 11, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FaCheck size={10} /> {value.name} — {(value.size / 1024).toFixed(0)} Ko
          </p>
        )}
      </div>

      {/* Aperçu */}
      {preview ? (
        <div style={{ position: 'relative' }}>
          <img src={preview} alt="Aperçu"
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
          />
          <button type="button" onClick={clear}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%',
              width: 26, height: 26, cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <FaTimes size={11} />
          </button>
          {existingUrl && !filePreview && (
            <span style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 10, padding: '2px 7px', borderRadius: 4 }}>
              Image actuelle
            </span>
          )}
        </div>
      ) : (
        <div style={{
          height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-gray)', fontSize: 12, gap: 8, background: 'var(--pink-very-light)',
        }}>
          <FaImage size={18} style={{ opacity: 0.3 }} />
          <span style={{ opacity: 0.45 }}>Aperçu de l'image ici</span>
        </div>
      )}
    </div>
  );
}

function ArticleForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    initial
      ? { titre: initial.titre || '', resume: initial.resume || '', contenu: initial.contenu || '', categorie: initial.categorie || 'Actualité', image: null }
      : { ...EMPTY_FORM }
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ background: 'var(--pink-ultra-light)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
      <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--red-primary)' }}>
        {initial ? 'Modifier l\'actualité' : 'Nouvelle actualité'}
      </h4>

      <input className="form-input" placeholder="Titre de l'actualité *" value={form.titre}
        onChange={set('titre')} style={{ marginBottom: 10 }} required />

      <select className="form-input" value={form.categorie} onChange={set('categorie')} style={{ marginBottom: 10 }}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <input className="form-input" placeholder="Résumé / accroche (optionnel)" value={form.resume}
        onChange={set('resume')} style={{ marginBottom: 10 }} />

      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-gray)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Image de couverture
      </label>
      <ImagePicker
        existingUrl={initial?.imageUrl || initial?.image || null}
        value={form.image}
        onChange={(file) => setForm((f) => ({ ...f, image: file }))}
      />

      <textarea className="form-input" placeholder="Contenu de l'actualité *" rows={7}
        value={form.contenu} onChange={set('contenu')}
        style={{ resize: 'vertical', marginBottom: 16 }} required />

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn-add" style={{ padding: '10px 24px' }}
          disabled={saving || !form.titre}
          onClick={() => onSave(form)}>
          {saving ? 'Enregistrement…' : <><FaCheck size={12} style={{ marginRight: 6 }} />Enregistrer</>}
        </button>
        <button type="button" onClick={onCancel}
          style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ─── carte article ────────────────────────────────────────── */
const STATUT_BADGE = {
  PUBLIE:    { label: 'Publié',   bg: 'rgba(46,125,50,0.12)',  color: '#2e7d32' },
  BROUILLON: { label: 'Brouillon', bg: 'rgba(245,124,0,0.12)', color: '#f57c00' },
  ARCHIVE:   { label: 'Archivé',  bg: 'rgba(100,100,100,0.12)', color: '#666' },
};

function ArticleCard({ article, canEdit, onEdit, onDelete, onPublish, onArchive }) {
  const [expanded, setExpanded] = useState(false);
  const statut = (article.statut || (article.publie ?? article.published ? 'PUBLIE' : 'BROUILLON')).toUpperCase();
  const badge = STATUT_BADGE[statut] || STATUT_BADGE.BROUILLON;
  const imageUrl = article.imageUrl || article.image || null;
  const contenu = article.contenu || '';
  const resume = article.resume || '';

  return (
    <div style={{
      border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12,
      overflow: 'hidden', marginBottom: 16, background: 'white',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {imageUrl && (
        <img src={imageUrl} alt={article.titre}
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      <div style={{ padding: '14px 18px' }}>
        {/* En-tête badges + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(139,28,28,0.1)', color: 'var(--red-primary)', padding: '2px 8px', borderRadius: 999 }}>
              {article.categorie || 'Actualité'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 999 }}>
              {badge.label}
            </span>
            {article.nbVues != null && (
              <span style={{ fontSize: 11, color: 'var(--text-gray)' }}>👁 {article.nbVues}</span>
            )}
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {statut === 'BROUILLON' && (
                <button type="button" onClick={() => onPublish(article)} title="Publier"
                  style={{ background: 'rgba(46,125,50,0.1)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#2e7d32', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FaGlobe size={10} /> Publier
                </button>
              )}
              {statut === 'PUBLIE' && (
                <button type="button" onClick={() => onArchive(article)} title="Archiver"
                  style={{ background: 'rgba(100,100,100,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#666', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FaArchive size={10} /> Archiver
                </button>
              )}
              <button type="button" onClick={() => onEdit(article)}
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaEdit size={11} color="#555" />
              </button>
              <button type="button" onClick={() => onDelete(article)}
                style={{ background: 'rgba(198,40,40,0.08)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaTrash size={11} color="#c62828" />
              </button>
            </div>
          )}
        </div>

        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: 'var(--text-dark)' }}>
          {article.titre}
        </h3>

        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-gray)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FaCalendarAlt size={10} />
          {formatDate(article.datePublication || article.createdAt || article.dateCreation)}
          {article.auteur && <> · <strong>{article.auteur}</strong></>}
        </p>

        {resume && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 1.5 }}>{resume}</p>
        )}

        {contenu && (
          <>
            <p style={{ margin: 0, fontSize: 14, color: '#444', lineHeight: 1.65 }}>
              {expanded ? contenu : `${contenu.slice(0, 220)}${contenu.length > 220 ? '…' : ''}`}
            </p>
            {contenu.length > 220 && (
              <button type="button" onClick={() => setExpanded((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-primary)', fontSize: 13, fontWeight: 600, padding: '5px 0', marginTop: 4 }}>
                {expanded ? 'Réduire' : 'Lire la suite →'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── carte décès ──────────────────────────────────────────── */
function DecesCard({ item }) {
  return (
    <div style={{
      border: '1px solid rgba(198,40,40,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 12,
      background: 'rgba(198,40,40,0.02)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
            <FaHeartBroken size={13} color="var(--red-primary)" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>{item.pays}</span>
            <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
              <FaCalendarAlt size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Décès le {formatDate(item.dateDeces)}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-gray)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaMapMarkerAlt size={11} />
            {item.lieuDeces || '—'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-gray)' }}>
            Déclaré le {formatDate(item.dateDeclaration)}
          </p>
        </div>
        <span style={{
          background: declColor(item.statut),
          color: 'white',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {declLabel(item.statut)}
        </span>
      </div>
    </div>
  );
}

/* ─── composant principal ──────────────────────────────────── */

export default function Actualites() {
  const { hasRole } = useAuth();
  const canPublish = hasRole(['SUPER_ADMIN', 'ADMIN_CONTENU', 'ADMIN_SUPPORT']);

  const [tab, setTab] = useState('articles'); // 'articles' | 'deces'

  /* articles */
  const [articles, setArticles] = useState([]);
  const [artLoading, setArtLoading] = useState(false);
  const [artError, setArtError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [artMsg, setArtMsg] = useState(null);

  /* déclarations */
  const [deces, setDeces] = useState([]);
  const [decesLoading, setDecesLoading] = useState(false);
  const [decesError, setDecesError] = useState(null);
  const [decesPage, setDecesPage] = useState(0);
  const [decesTotalPages, setDecesTotalPages] = useState(1);

  /* ── chargement articles ── */
  const loadArticles = useCallback(async () => {
    setArtLoading(true);
    setArtError(null);
    try {
      const data = await listAdminArticles({ page: 0, size: 30, sort: 'datePublication,desc' });
      setArticles(normalizeList(data));
    } catch {
      setArtError('Impossible de charger les actualités pour le moment.');
      setArticles([]);
    } finally {
      setArtLoading(false);
    }
  }, []);

  /* ── chargement décès ── */
  const loadDeces = useCallback(async () => {
    setDecesLoading(true);
    setDecesError(null);
    try {
      const data = await listDeclarations({ page: decesPage, size: 10, sort: 'dateDeclaration,desc' });
      setDeces(normalizeList(data));
      setDecesTotalPages(data?.totalPages ?? 1);
    } catch {
      setDecesError('Impossible de charger les déclarations.');
      setDeces([]);
    } finally {
      setDecesLoading(false);
    }
  }, [decesPage]);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => { loadDeces(); }, [loadDeces]);

  /* ── actions articles ── */
  const handleSave = async (form) => {
    setFormSaving(true);
    setArtMsg(null);
    try {
      if (editTarget?.id) {
        await updateArticle(editTarget.id, form);
        setArtMsg({ type: 'success', text: 'Actualité mise à jour.' });
      } else {
        await createArticle(form);
        setArtMsg({ type: 'success', text: 'Actualité créée.' });
      }
      setShowForm(false);
      setEditTarget(null);
      await loadArticles();
    } catch (err) {
      const detail = err?.response?.data?.message
        || err?.response?.data?.error
        || err?.response?.data
        || err?.message
        || 'Erreur lors de la sauvegarde.';
      setArtMsg({ type: 'error', text: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm('Supprimer cette actualité ?')) return;
    try {
      await deleteArticle(article.id);
      setArtMsg({ type: 'success', text: 'Actualité supprimée.' });
      await loadArticles();
    } catch {
      setArtMsg({ type: 'error', text: 'Impossible de supprimer l\'actualité.' });
    }
  };

  const handlePublish = async (article) => {
    try {
      await publishArticle(article.id);
      setArtMsg({ type: 'success', text: 'Actualité publiée.' });
      await loadArticles();
    } catch {
      setArtMsg({ type: 'error', text: 'Impossible de publier l\'actualité.' });
    }
  };

  const handleArchive = async (article) => {
    try {
      await archiveArticle(article.id);
      setArtMsg({ type: 'success', text: 'Actualité archivée.' });
      await loadArticles();
    } catch {
      setArtMsg({ type: 'error', text: 'Impossible d\'archiver l\'actualité.' });
    }
  };

  const handleEdit = (article) => {
    setEditTarget(article);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditTarget(null);
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        {/* Onglets */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border-light)', paddingBottom: 0 }}>
          {[
            { key: 'articles', label: 'Actualités', icon: FaNewspaper },
            { key: 'deces', label: 'Décès déclarés', icon: FaHeartBroken },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === key ? '3px solid var(--red-primary)' : '3px solid transparent',
                padding: '10px 18px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tab === key ? 700 : 500,
                color: tab === key ? 'var(--red-primary)' : 'var(--text-gray)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: -2,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ══ ONGLET ARTICLES ══ */}
        {tab === 'articles' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                <FaNewspaper size={15} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
                Actualités RSC
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-small" type="button" onClick={loadArticles} disabled={artLoading}>
                  {artLoading ? '…' : 'Actualiser'}
                </button>
                {canPublish && !showForm && (
                  <button
                    type="button"
                    className="btn-add"
                    style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                    onClick={() => { setEditTarget(null); setShowForm(true); }}
                  >
                    <FaPlus size={11} /> Nouvelle actualité
                  </button>
                )}
                {canPublish && showForm && (
                  <button type="button" onClick={handleCancelForm}
                    style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FaTimes size={11} /> Annuler
                  </button>
                )}
              </div>
            </div>

            {artMsg && (
              <div style={{
                marginBottom: 14, padding: '10px 12px', borderRadius: 8, fontSize: 13,
                background: artMsg.type === 'success' ? 'rgba(46,125,50,0.12)' : 'rgba(198,40,40,0.12)',
                color: artMsg.type === 'success' ? '#2e7d32' : '#c62828',
              }}>
                {artMsg.text}
              </div>
            )}

            {showForm && (
              <ArticleForm
                initial={editTarget ? { titre: editTarget.titre, contenu: editTarget.contenu, categorie: editTarget.categorie || 'Actualité', image: editTarget.image || '' } : null}
                onSave={handleSave}
                onCancel={handleCancelForm}
                saving={formSaving}
              />
            )}

            {artLoading && articles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)', fontSize: 13 }}>Chargement…</div>
            )}

            {!artLoading && artError && (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <FaNewspaper size={36} style={{ marginBottom: 12, opacity: 0.2 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>Aucune actualité disponible</p>
                <p style={{ fontSize: 13, color: 'var(--text-gray)' }}>
                  {canPublish ? 'Créez la première actualité RSC en cliquant sur "Nouvelle actualité".' : 'Les actualités publiées par l\'équipe RSC apparaîtront ici.'}
                </p>
              </div>
            )}

            {!artLoading && !artError && articles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <FaNewspaper size={36} style={{ marginBottom: 12, opacity: 0.2 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>Aucune actualité pour l'instant</p>
                <p style={{ fontSize: 13, color: 'var(--text-gray)' }}>
                  {canPublish ? 'Créez la première actualité RSC en cliquant sur "Nouvelle actualité".' : 'Les actualités publiées par l\'équipe RSC apparaîtront ici.'}
                </p>
              </div>
            )}

            {articles.map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                canEdit={canPublish}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPublish={handlePublish}
                onArchive={handleArchive}
              />
            ))}
          </>
        )}

        {/* ══ ONGLET DÉCÈS ══ */}
        {tab === 'deces' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                <FaHeartBroken size={15} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
                Décès déclarés dans la communauté
              </h3>
              <button className="btn-small" type="button" onClick={loadDeces} disabled={decesLoading}>
                {decesLoading ? '…' : 'Actualiser'}
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 16, padding: '10px 14px', background: 'rgba(139,28,28,0.05)', borderRadius: 8, borderLeft: '3px solid var(--red-primary)' }}>
              Cette liste répertorie les décès déclarés par les membres de la communauté RSC et pris en charge par notre équipe.
            </p>

            {decesLoading && deces.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)', fontSize: 13 }}>Chargement…</div>
            )}

            {!decesLoading && decesError && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)', fontSize: 13 }}>{decesError}</div>
            )}

            {!decesLoading && !decesError && deces.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <FaHeartBroken size={32} style={{ marginBottom: 10, opacity: 0.2 }} />
                <p style={{ fontSize: 13, color: 'var(--text-gray)' }}>Aucun décès déclaré pour le moment.</p>
              </div>
            )}

            {deces.map((d) => (
              <DecesCard key={d.id} item={{
                pays: d.pays,
                dateDeces: d.dateDeces,
                lieuDeces: d.lieuDeces,
                dateDeclaration: d.dateDeclaration,
                statut: d.statut,
              }} />
            ))}

            {decesTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button className="btn-small" onClick={() => setDecesPage((p) => Math.max(0, p - 1))} disabled={decesPage === 0 || decesLoading}>Précédent</button>
                <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>Page {decesPage + 1} / {decesTotalPages}</span>
                <button className="btn-small" onClick={() => setDecesPage((p) => Math.min(decesTotalPages - 1, p + 1))} disabled={decesPage >= decesTotalPages - 1 || decesLoading}>Suivant</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
