import { useCallback, useMemo, useState } from 'react';
import { FaMapMarkerAlt, FaHome, FaTrash, FaStar, FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { listByUser, createAddress, deleteAddress, setPrincipal } from '../services/addresses';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';
import { StatsRow } from './Statistics';
import AddressAutocomplete from '../components/AddressAutocomplete';

const INITIAL_FORM = {
  province: '',
  ville: '',
  codePostal: '',
  adresseComplete: '',
  estPrincipale: false,
};

function Addresses() {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [msg, setMsg] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [rowLoadingId, setRowLoadingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetcher = useCallback(() => {
    if (!user?.id) return Promise.resolve([]);
    return listByUser(user.id);
  }, [user?.id]);

  const { data, loading, lastUpdated, refresh } = useRealtimeResource(
    `addresses-${user?.id || 'guest'}`,
    fetcher,
    {
      enabled: Boolean(user?.id),
      interval: REALTIME_INTERVALS.addresses,
      immediate: Boolean(user?.id),
    },
  );

  const addresses = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      setMsg({ type: 'error', text: 'Utilisateur non identifié.' });
      return;
    }
    setMsg(null);
    setCreateLoading(true);
    try {
      await createAddress(user.id, {
        province: form.province,
        ville: form.ville,
        codePostal: form.codePostal,
        adresseComplete: form.adresseComplete,
        latitude: 0,
        longitude: 0,
        estPrincipale: form.estPrincipale,
      });
      setMsg({ type: 'success', text: 'Adresse ajoutée avec succès.' });
      setForm(INITIAL_FORM);
      setShowForm(false);
      await refresh();
    } catch (err) {
      setMsg({ type: 'error', text: "Erreur lors de l'ajout de l'adresse." });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette adresse ?')) return;
    setRowLoadingId(id);
    try {
      await deleteAddress(id);
      setMsg({ type: 'success', text: 'Adresse supprimée.' });
      await refresh();
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors de la suppression.' });
    } finally {
      setRowLoadingId(null);
    }
  };

  const handleSetPrincipal = async (id) => {
    setRowLoadingId(id);
    try {
      await setPrincipal(id);
      setMsg({ type: 'success', text: 'Adresse principale mise à jour.' });
      await refresh();
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors du changement.' });
    } finally {
      setRowLoadingId(null);
    }
  };

  return (
    <div>
      <StatsRow />

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 className="content-card-title" style={{ margin: 0 }}>
              <FaHome size={14} style={{ marginRight: 8, color: 'var(--red-primary)', verticalAlign: 'middle' }} />
              Mes adresses
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-gray)', margin: '4px 0 0' }}>
              {addresses.length} adresse{addresses.length !== 1 ? 's' : ''} enregistrée{addresses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
            <button
              className="btn-add"
              type="button"
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowForm((v) => !v)}
            >
              <FaPlus size={11} />
              {showForm ? 'Annuler' : 'Ajouter'}
            </button>
          </div>
        </div>

        {msg && (
          <div style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
            background: msg.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
            color: msg.type === 'success' ? '#2e7d32' : '#c62828',
          }}>
            {msg.text}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div style={{ background: 'var(--pink-ultra-light)', borderRadius: 10, padding: '16px 18px', marginBottom: 20, border: '1px solid var(--border-light)' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Nouvelle adresse</h4>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <p className="settings-label">Rechercher l'adresse <span style={{ color: '#c62828' }}>*</span></p>
                  <AddressAutocomplete
                    value={form.adresseComplete}
                    onChange={(val) => setForm((prev) => ({ ...prev, adresseComplete: val }))}
                    onSelect={({ adresseComplete, ville, province, codePostal }) =>
                      setForm((prev) => ({ ...prev, adresseComplete, ville, province, codePostal }))
                    }
                    required
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-gray)', margin: '4px 0 0' }}>
                    Tapez votre adresse — province, ville et code postal se remplissent automatiquement.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <p className="settings-label">Province <span style={{ color: '#c62828' }}>*</span></p>
                    <input
                      className="form-input"
                      placeholder="Auto-rempli"
                      value={form.province}
                      onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <p className="settings-label">Ville <span style={{ color: '#c62828' }}>*</span></p>
                    <input
                      className="form-input"
                      placeholder="Auto-rempli"
                      value={form.ville}
                      onChange={(e) => setForm((prev) => ({ ...prev, ville: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <p className="settings-label">Code postal <span style={{ color: '#c62828' }}>*</span></p>
                    <input
                      className="form-input"
                      placeholder="H1A 1A1"
                      value={form.codePostal}
                      pattern="[A-Za-z][0-9][A-Za-z][\s]?[0-9][A-Za-z][0-9]"
                      title="Code postal canadien requis, ex : H1A 1A1"
                      maxLength={7}
                      onChange={(e) => {
                        const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        const formatted = raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3, 6)}` : raw;
                        setForm((prev) => ({ ...prev, codePostal: formatted }));
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={form.estPrincipale}
                      onChange={(e) => setForm((prev) => ({ ...prev, estPrincipale: e.target.checked }))}
                      style={{ width: 16, height: 16 }}
                    />
                    Définir comme adresse principale
                  </label>
                </div>
              </div>
              <button type="submit" className="btn-add" style={{ marginTop: 12 }} disabled={createLoading}>
                {createLoading ? 'Ajout en cours…' : 'Enregistrer l\'adresse'}
              </button>
            </form>
          </div>
        )}

        {/* Address list */}
        {loading && addresses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-gray)' }}>Chargement…</div>
        )}
        {!loading && addresses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-gray)' }}>
            <FaMapMarkerAlt size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucune adresse enregistrée</p>
            <p style={{ fontSize: 13 }}>Ajoutez votre adresse canadienne pour compléter votre profil.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {addresses.map((a) => (
            <div
              key={a.id}
              style={{
                padding: '14px 16px',
                border: `1px solid ${a.estPrincipale ? 'rgba(198,40,40,0.3)' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: 10,
                background: a.estPrincipale ? 'rgba(198,40,40,0.04)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <FaMapMarkerAlt size={13} color={a.estPrincipale ? 'var(--red-primary)' : 'var(--text-gray)'} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{a.adresseComplete}</span>
                    {a.estPrincipale && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(198,40,40,0.12)', color: 'var(--red-primary)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                        <FaStar size={9} /> Principale
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-gray)' }}>
                    {[a.ville, a.province, a.codePostal].filter(Boolean).join(' — ')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!a.estPrincipale && (
                    <button
                      className="btn-small"
                      type="button"
                      onClick={() => handleSetPrincipal(a.id)}
                      disabled={rowLoadingId === a.id}
                      title="Définir comme principale"
                    >
                      <FaStar size={11} style={{ marginRight: 4 }} />
                      Principale
                    </button>
                  )}
                  <button
                    className="btn-small"
                    type="button"
                    style={{ borderColor: 'rgba(198,40,40,0.4)', color: '#c62828' }}
                    onClick={() => handleDelete(a.id)}
                    disabled={rowLoadingId === a.id}
                    title="Supprimer"
                  >
                    <FaTrash size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Addresses;
