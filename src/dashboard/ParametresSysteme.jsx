import { useState, useEffect } from 'react';
import { FaCog, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import {
  listParametres,
  listParametresByCategorie,
  createParametre,
  updateParametre,
  patchValeur,
  deleteParametre,
} from '../services/parametresSysteme';

const CATEGORIES = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'SYSTEME', label: 'Système' },
  { value: 'NOTIFICATION', label: 'Notification' },
  { value: 'SECURITE', label: 'Sécurité' },
];

const TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'];

const EMPTY_FORM = {
  cle: '', valeur: '', description: '', categorie: 'SYSTEME', type: 'STRING', publicAccess: false,
};

const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.content)) return p.content;
  return [];
};

function ParamRow({ param, onEdit, onDelete, onPatch }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(param.valeur ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onPatch(param.cle, val);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, wordBreak: 'break-all' }}>{param.cle}</p>
        {param.description && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-gray)' }}>{param.description}</p>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {param.categorie && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(139,28,28,0.08)', color: 'var(--red-primary)', fontWeight: 600 }}>
              {param.categorie}
            </span>
          )}
          {param.type && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#f5f5f5', color: '#555', fontWeight: 600 }}>
              {param.type}
            </span>
          )}
          {param.publicAccess && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(21,101,192,0.1)', color: '#1565c0', fontWeight: 600 }}>
              PUBLIC
            </span>
          )}
        </div>
      </div>

      <div>
        {editing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="form-input" value={val} onChange={(e) => setVal(e.target.value)}
              style={{ flex: 1, fontSize: 13, padding: '6px 10px' }} />
            <button onClick={save} disabled={saving}
              style={{ background: '#2e7d32', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
              <FaCheck size={12} />
            </button>
            <button onClick={() => { setEditing(false); setVal(param.valeur ?? ''); }}
              style={{ background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
              <FaTimes size={12} />
            </button>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>
            {param.valeur ?? <em style={{ color: 'var(--text-gray)' }}>—</em>}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => setEditing(true)}
          style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#1565c0' }}>
          <FaEdit size={12} />
        </button>
        <button onClick={() => onEdit(param)}
          style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#f57c00' }}>
          <FaCog size={12} />
        </button>
        <button onClick={() => onDelete(param.id)}
          style={{ background: 'none', border: '1px solid rgba(198,40,40,0.3)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#c62828' }}>
          <FaTrash size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ParametresSysteme() {
  const { user } = useAuth();
  const adminId = user?.email || user?.id || 'admin';

  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [status, setStatus] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const fetcher = catFilter ? listParametresByCategorie(catFilter) : listParametres();
    fetcher.then((data) => setParams(normalizeList(data))).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [catFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (param) => {
    setEditTarget(param);
    setForm({
      cle: param.cle ?? '',
      valeur: param.valeur ?? '',
      description: param.description ?? '',
      categorie: param.categorie ?? 'SYSTEME',
      type: param.type ?? 'STRING',
      publicAccess: param.publicAccess ?? false,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      if (editTarget) {
        await updateParametre(editTarget.id, adminId, form);
      } else {
        await createParametre(adminId, form);
      }
      setStatus({ type: 'success', message: editTarget ? 'Paramètre mis à jour.' : 'Paramètre créé.' });
      setShowForm(false);
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erreur.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce paramètre ?')) return;
    try {
      await deleteParametre(id);
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Impossible de supprimer.' });
    }
  };

  const handlePatch = async (cle, valeur) => {
    await patchValeur(cle, valeur, adminId);
    load();
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 className="content-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaCog size={16} color="var(--red-primary)" />
            Paramètres système
          </h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select className="form-input" value={catFilter}
              onChange={(e) => { setCatFilter(e.target.value); }}
              style={{ width: 200 }}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button className="btn-add" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaPlus size={12} /> Nouveau
            </button>
          </div>
        </div>

        {status && (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, fontSize: 13,
            background: status.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
            color: status.type === 'success' ? '#2e7d32' : '#c62828' }}>
            {status.message}
          </div>
        )}

        {loading && <div style={{ color: 'var(--text-gray)', fontSize: 13 }}>Chargement…</div>}
        {!loading && params.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>Aucun paramètre trouvé.</div>
        )}

        {params.map((p) => (
          <ParamRow key={p.id} param={p} onEdit={openEdit} onDelete={handleDelete} onPatch={handlePatch} />
        ))}
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 480, position: 'relative' }}>
            <button onClick={() => setShowForm(false)}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
              <FaTimes size={18} />
            </button>

            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>
              {editTarget ? 'Modifier le paramètre' : 'Nouveau paramètre'}
            </h3>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <p className="settings-label">Clé *</p>
                  <input className="form-input" value={form.cle} onChange={(e) => setForm({ ...form, cle: e.target.value })}
                    placeholder="app.montant.cotisation" required disabled={!!editTarget} />
                </div>
                <div>
                  <p className="settings-label">Valeur *</p>
                  <input className="form-input" value={form.valeur} onChange={(e) => setForm({ ...form, valeur: e.target.value })}
                    placeholder="50" required />
                </div>
                <div>
                  <p className="settings-label">Description</p>
                  <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description du paramètre" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <p className="settings-label">Catégorie</p>
                    <select className="form-input" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                      {CATEGORIES.filter((c) => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="settings-label">Type</p>
                    <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.publicAccess}
                    onChange={(e) => setForm({ ...form, publicAccess: e.target.checked })} />
                  Accès public (visible sans authentification)
                </label>
              </div>

              {status && showForm && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  background: status.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
                  color: status.type === 'success' ? '#2e7d32' : '#c62828' }}>
                  {status.message}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: 12, borderRadius: 8, border: '2px solid var(--pink-light)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-add" disabled={saving}>
                  {saving ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
