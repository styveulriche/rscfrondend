import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  FaUserShield,
  FaSyncAlt,
  FaPlus,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaKey,
  FaUserCheck,
  FaEdit,
  FaTimes,
} from 'react-icons/fa';
import { StatsRow } from './Statistics';
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  activateAdmin,
  deactivateAdmin,
  adminsByRole,
  activeAdmins,
  adminExists,
  hasPermission,
  updatePermissions,
  updateLastAccess,
} from '../services/administrateurs';
import { useRealtimeResource } from '../hooks/useRealtimeResource';
import { REALTIME_INTERVALS } from '../config/realtime';

const PERMISSIONS = [
  { value: 'ACCES_STATISTIQUES',    label: 'Accès aux statistiques' },
  { value: 'GESTION_FINANCES',      label: 'Gestion des finances' },
  { value: 'VALIDATION_PAIEMENTS',  label: 'Validation des paiements' },
  { value: 'GESTION_DECLARATIONS',  label: 'Gestion des déclarations' },
  { value: 'GESTION_UTILISATEURS',  label: 'Gestion des utilisateurs' },
  { value: 'SUPPORT_UTILISATEURS',  label: 'Support utilisateurs' },
  { value: 'ENVOI_NOTIFICATIONS',   label: 'Envoi de notifications' },
  { value: 'GESTION_CONTENU',       label: 'Gestion du contenu' },
  { value: 'MODERATION',            label: 'Modération' },
  { value: 'GESTION_ADMINS',        label: 'Gestion des administrateurs' },
];

// Permissions par défaut selon le rôle
const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  SUPER_ADMIN:       PERMISSIONS.map((p) => p.value),
  ADMIN_FINANCIER:   ['ACCES_STATISTIQUES', 'GESTION_FINANCES', 'VALIDATION_PAIEMENTS'],
  ADMIN_CONTENU:     ['ACCES_STATISTIQUES', 'GESTION_CONTENU', 'ENVOI_NOTIFICATIONS', 'MODERATION'],
  ADMIN_SUPPORT:     ['ACCES_STATISTIQUES', 'GESTION_UTILISATEURS', 'SUPPORT_UTILISATEURS', 'ENVOI_NOTIFICATIONS'],
  ADMIN_VALIDATEUR:  ['ACCES_STATISTIQUES', 'GESTION_DECLARATIONS', 'GESTION_UTILISATEURS'],
  MODERATEUR:        ['ACCES_STATISTIQUES', 'GESTION_CONTENU', 'MODERATION'],
});

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super admin' },
  { value: 'ADMIN_VALIDATEUR', label: 'Admin validateur' },
  { value: 'ADMIN_CONTENU', label: 'Admin contenu' },
  { value: 'ADMIN_SUPPORT', label: 'Admin support' },
  { value: 'ADMIN_FINANCIER', label: 'Admin financier' },
  { value: 'MODERATEUR', label: 'Modérateur' },
];

const INITIAL_FORM = Object.freeze({
  nom: '',
  prenom: '',
  email: '',
  motDePasse: '',
  role: 'ADMIN_VALIDATEUR',
});

const normalizePage = (payload) => {
  if (!payload) {
    return { content: [], totalPages: 0, totalElements: 0, number: 0 };
  }
  if (Array.isArray(payload)) {
    return { content: payload, totalPages: 1, totalElements: payload.length, number: 0 };
  }
  return {
    content: Array.isArray(payload.content) ? payload.content : [],
    totalPages: payload.totalPages ?? 1,
    totalElements: payload.totalElements ?? payload.content?.length ?? 0,
    number: payload.number ?? 0,
  };
};


function Administrateurs() {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('dateCreation,desc');
  const [roleFilter, setRoleFilter] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formStatus, setFormStatus] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [permissionInput, setPermissionInput] = useState('GESTION_DOSSIERS');
  const [permissionResult, setPermissionResult] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [toolStatus, setToolStatus] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null); // { id, nom, prenom, email, role }
  const [editStatus, setEditStatus] = useState(null);

  const fetcher = useCallback(async () => {
    const pageable = { page, size: 8, sort };
    const [listRes, activeRes, roleRes] = await Promise.allSettled([
      listAdmins(pageable),
      activeAdmins(),
      roleFilter ? adminsByRole(roleFilter) : Promise.resolve(null),
    ]);
    return {
      list: listRes.status === 'fulfilled' ? listRes.value : null,
      active: activeRes.status === 'fulfilled' ? activeRes.value : [],
      filtered: roleRes.status === 'fulfilled' ? roleRes.value : [],
    };
  }, [page, sort, roleFilter]);

  const { data, loading, error, lastUpdated, refresh } = useRealtimeResource(
    `admins-${page}-${sort}-${roleFilter || 'all'}`,
    fetcher,
    {
      enabled: true,
      immediate: true,
      interval: REALTIME_INTERVALS.default,
    },
  );

  const pageData = useMemo(() => normalizePage(data?.list), [data?.list]);
  const admins = pageData.content;
  const totalPages = pageData.totalPages;
  const activeList = Array.isArray(data?.active) ? data.active : [];
  const filteredList = Array.isArray(data?.filtered) ? data.filtered : [];

  useEffect(() => {
    if (!selectedAdminId && admins.length > 0) {
      setSelectedAdminId(admins[0].id);
    }
  }, [admins, selectedAdminId]);

  // Pré-remplir les permissions selon le rôle de l'admin sélectionné
  useEffect(() => {
    if (!selectedAdminId) return;
    const admin = admins.find((a) => a.id === selectedAdminId);
    if (!admin) return;
    const defaults = ROLE_DEFAULT_PERMISSIONS[admin.role] || [];
    setSelectedPermissions(defaults);
    setPermissionInput(defaults[0] || PERMISSIONS[0].value);
  }, [selectedAdminId, admins]);

  const handleEmailBlur = async () => {
    if (!formData.email) {
      setEmailExists(null);
      return;
    }
    setCheckingEmail(true);
    try {
      const exists = await adminExists(formData.email);
      setEmailExists(Boolean(exists));
    } catch (err) {
      console.error('Erreur lors de la vérification de l\'email', err?.response || err);
      setEmailExists(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    setFormStatus(null);
    if (!formData.nom || !formData.prenom || !formData.email || !formData.motDePasse) {
      setFormStatus({ type: 'error', message: 'Tous les champs sont requis.' });
      return;
    }
    if (emailExists) {
      setFormStatus({ type: 'error', message: 'Cet email est déjà utilisé.' });
      return;
    }
    try {
      await createAdmin(formData);
      setFormStatus({ type: 'success', message: 'Administrateur créé avec succès.' });
      setFormData(INITIAL_FORM);
      setEmailExists(null);
      refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de créer l\'administrateur.';
      setFormStatus({ type: 'error', message });
    }
  };

  const handleToggleActive = async (admin) => {
    try {
      if (admin.actif) {
        await deactivateAdmin(admin.id);
      } else {
        await activateAdmin(admin.id);
      }
      refresh();
    } catch (err) {
      console.error('Erreur lors du changement de statut', err?.response || err);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!window.confirm(`Supprimer ${admin.prenom} ${admin.nom} ?`)) {
      return;
    }
    try {
      await deleteAdmin(admin.id);
      refresh();
    } catch (err) {
      console.error('Erreur lors de la suppression', err?.response || err);
    }
  };

  const handleRefreshAccess = async (adminId) => {
    try {
      await updateLastAccess(adminId);
      setToolStatus({ type: 'success', message: 'Dernier accès mis à jour.' });
      refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de mettre à jour le dernier accès.';
      setToolStatus({ type: 'error', message });
    }
  };

  const handleStartEdit = (admin) => {
    setEditingAdmin({ id: admin.id, nom: admin.nom, prenom: admin.prenom, email: admin.email, role: admin.role || 'ADMIN_VALIDATEUR' });
    setEditStatus(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditStatus(null);
    try {
      const { id, ...payload } = editingAdmin;
      await updateAdmin(id, payload);
      setEditStatus({ type: 'success', message: 'Administrateur mis à jour.' });
      setEditingAdmin(null);
      refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de mettre à jour.';
      setEditStatus({ type: 'error', message });
    }
  };

  const handleCheckPermission = async (event) => {
    event.preventDefault();
    if (!selectedAdminId || !permissionInput) return;
    try {
      const has = await hasPermission(selectedAdminId, permissionInput);
      setPermissionResult({ permission: permissionInput, value: Boolean(has) });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de vérifier la permission.';
      setPermissionResult({ permission: permissionInput, value: null, error: message });
    }
  };

  const handleUpdatePermissions = async (event) => {
    event.preventDefault();
    if (!selectedAdminId) return;
    if (selectedPermissions.length === 0) {
      setToolStatus({ type: 'error', message: 'Sélectionnez au moins une permission.' });
      return;
    }
    try {
      await updatePermissions(selectedAdminId, selectedPermissions);
      setToolStatus({ type: 'success', message: 'Permissions mises à jour.' });
      setSelectedPermissions([]);
      refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de mettre à jour les permissions.';
      setToolStatus({ type: 'error', message });
    }
  };

  const togglePermission = (value) => {
    setSelectedPermissions((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  };

  const summaryChips = [
    { label: 'Total', value: pageData.totalElements },
    { label: 'Actifs', value: activeList.length },
    { label: 'Filtre rôle', value: roleFilter ? `${roleFilter} (${filteredList.length})` : 'Aucun' },
  ];

  return (
    <div>
      <StatsRow />

      <div className="content-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 className="content-card-title" style={{ marginBottom: 4 }}>
              <FaUserShield size={16} color="var(--red-primary)" style={{ marginRight: 8 }} />
              Gestion des administrateurs
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-gray)' }}>
              Suivez les comptes, leurs rôles et leurs statuts actifs en temps réel.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                Mise à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-small" type="button" onClick={refresh} disabled={loading}>
              <FaSyncAlt size={12} style={{ marginRight: 6 }} />
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '18px 0' }}>
          {summaryChips.map(({ label, value }) => (
            <div key={label} style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.8)',
            }}>
              {label}: <strong style={{ color: 'white', marginLeft: 4 }}>{value}</strong>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-gray)' }}>
            Tri
            <select
              className="form-input"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(0); }}
              style={{ marginTop: 6 }}
            >
              <option value="dateCreation,desc">Plus récents</option>
              <option value="dateCreation,asc">Plus anciens</option>
              <option value="nom,asc">Nom A-Z</option>
            </select>
          </label>
          <label style={{ fontSize: 12, color: 'var(--text-gray)' }}>
            Filtrer par rôle
            <select
              className="form-input"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
              style={{ marginTop: 6 }}
            >
              <option value="">Tous les rôles</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div style={{ color: 'var(--red-primary)', marginBottom: 12 }}>
            Impossible de récupérer les administrateurs.
          </div>
        )}

        {admins.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-gray)' }}>
            Aucun administrateur trouvé.
          </div>
        )}

        {admins.length > 0 && (
          <div className="table" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-gray)' }}>
                  <th style={{ padding: '8px 6px' }}>Nom</th>
                  <th style={{ padding: '8px 6px' }}>Email</th>
                  <th style={{ padding: '8px 6px' }}>Rôle</th>
                  <th style={{ padding: '8px 6px' }}>Statut</th>
                  <th style={{ padding: '8px 6px' }}>Dernier accès</th>
                  <th style={{ padding: '8px 6px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <td style={{ padding: '8px 6px' }}>{admin.prenom} {admin.nom}</td>
                    <td style={{ padding: '8px 6px' }}>{admin.email}</td>
                    <td style={{ padding: '8px 6px' }}>{admin.role || '—'}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        background: admin.actif ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
                        color: admin.actif ? '#2e7d32' : '#c62828',
                      }}>
                        {admin.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      {admin.dernierAcces
                        ? new Date(admin.dernierAcces).toLocaleString('fr-CA')
                        : 'Jamais'}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleToggleActive(admin)}
                        >
                          {admin.actif ? (
                            <span><FaToggleOff size={11} style={{ marginRight: 4 }} /> Désactiver</span>
                          ) : (
                            <span><FaToggleOn size={11} style={{ marginRight: 4 }} /> Activer</span>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleRefreshAccess(admin.id)}
                        >
                          <FaUserCheck size={11} style={{ marginRight: 4 }} /> Ping accès
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleStartEdit(admin)}
                        >
                          <FaEdit size={11} style={{ marginRight: 4 }} /> Éditer
                        </button>
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => handleDeleteAdmin(admin)}
                          style={{ borderColor: 'rgba(198,40,40,0.5)', color: '#c62828' }}
                        >
                          <FaTrash size={11} style={{ marginRight: 4 }} /> Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingAdmin && (
          <div style={{ marginTop: 20, padding: '16px 18px', borderRadius: 10, background: 'var(--pink-ultra-light)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Modifier l'administrateur</h4>
              <button type="button" className="btn-small" onClick={() => { setEditingAdmin(null); setEditStatus(null); }}>
                <FaTimes size={11} style={{ marginRight: 4 }} /> Annuler
              </button>
            </div>
            {editStatus && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                background: editStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
                color: editStatus.type === 'success' ? '#2e7d32' : '#c62828' }}>
                {editStatus.message}
              </div>
            )}
            <form onSubmit={handleSaveEdit}>
              <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <label className="settings-label">
                  Nom
                  <input className="form-input" value={editingAdmin.nom}
                    onChange={(e) => setEditingAdmin((prev) => ({ ...prev, nom: e.target.value }))} required />
                </label>
                <label className="settings-label">
                  Prénom
                  <input className="form-input" value={editingAdmin.prenom}
                    onChange={(e) => setEditingAdmin((prev) => ({ ...prev, prenom: e.target.value }))} required />
                </label>
                <label className="settings-label" style={{ gridColumn: 'span 2' }}>
                  Email
                  <input className="form-input" type="email" value={editingAdmin.email}
                    onChange={(e) => setEditingAdmin((prev) => ({ ...prev, email: e.target.value }))} required />
                </label>
                <label className="settings-label" style={{ gridColumn: 'span 2' }}>
                  Rôle
                  <select className="form-input" value={editingAdmin.role}
                    onChange={(e) => setEditingAdmin((prev) => ({ ...prev, role: e.target.value }))}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>
              </div>
              <button type="submit" className="btn-add" style={{ marginTop: 12 }}>
                <FaEdit size={11} style={{ marginRight: 6 }} /> Enregistrer les modifications
              </button>
            </form>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12 }}>
            <button
              className="btn-small"
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
            >
              Page précédente
            </button>
            <span>Page {page + 1} / {totalPages}</span>
            <button
              className="btn-small"
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page + 1 >= totalPages}
            >
              Page suivante
            </button>
          </div>
        )}
      </div>

      <div className="content-grid" style={{ display: 'grid', gap: 20, marginTop: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 12 }}>
            <FaPlus size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Ajouter un administrateur
          </h3>
          {formStatus && (
            <div style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12,
              background: formStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: formStatus.type === 'success' ? '#2e7d32' : '#c62828',
            }}>
              {formStatus.message}
            </div>
          )}
          <form onSubmit={handleCreateAdmin}>
            <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="settings-label">
                Nom
                <input className="form-input" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
              </label>
              <label className="settings-label">
                Prénom
                <input className="form-input" value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
              </label>
              <label className="settings-label" style={{ gridColumn: 'span 2' }}>
                Email
                <input
                  className="form-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={handleEmailBlur}
                />
                {checkingEmail && <span style={{ fontSize: 11, color: 'var(--text-gray)' }}>Vérification…</span>}
                {emailExists === false && <span style={{ fontSize: 11, color: '#2e7d32' }}>Disponible</span>}
                {emailExists === true && <span style={{ fontSize: 11, color: '#c62828' }}>Email déjà enregistré</span>}
              </label>
              <label className="settings-label" style={{ gridColumn: 'span 2' }}>
                Mot de passe temporaire
                <input
                  className="form-input"
                  type="password"
                  value={formData.motDePasse}
                  onChange={(e) => setFormData({ ...formData, motDePasse: e.target.value })}
                />
              </label>
              <label className="settings-label" style={{ gridColumn: 'span 2' }}>
                Rôle
                <select
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className="btn-add" style={{ marginTop: 16, padding: '12px 26px' }}>
              Créer l'administrateur
            </button>
          </form>
        </div>

        <div className="content-card">
          <h3 className="content-card-title" style={{ marginBottom: 12 }}>
            <FaKey size={14} style={{ marginRight: 8, color: 'var(--red-primary)' }} />
            Outils & permissions
          </h3>
          {toolStatus && (
            <div style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12,
              background: toolStatus.type === 'success' ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.15)',
              color: toolStatus.type === 'success' ? '#2e7d32' : '#c62828',
            }}>
              {toolStatus.message}
            </div>
          )}
          <label className="settings-label">
            Administrateur cible
            <select
              className="form-input"
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
            >
              {admins.length === 0 && <option value="">Aucun administrateur disponible</option>}
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.prenom} {admin.nom} ({admin.role || '—'})
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={handleCheckPermission} style={{ marginTop: 12 }}>
            <label className="settings-label">
              Vérifier une permission
              <select
                className="form-input"
                value={permissionInput}
                onChange={(e) => setPermissionInput(e.target.value)}
              >
                {PERMISSIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {permissionResult && (
              <div style={{ fontSize: 12, margin: '6px 0', color: permissionResult.value ? '#2e7d32' : '#c62828' }}>
                {permissionResult.error
                  ? permissionResult.error
                  : permissionResult.value
                    ? `Permission ${permissionResult.permission} accordée.`
                    : `Permission ${permissionResult.permission} refusée.`}
              </div>
            )}
            <button type="submit" className="btn-small" style={{ marginTop: 8 }}>
              Vérifier
            </button>
          </form>

          <form onSubmit={handleUpdatePermissions} style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p className="settings-label" style={{ margin: 0 }}>Permissions</p>
              {selectedAdminId && (() => {
                const admin = admins.find((a) => a.id === selectedAdminId);
                return admin?.role ? (
                  <span style={{ fontSize: 11, color: 'var(--text-gray)' }}>
                    Rôle : <strong>{admin.role}</strong>
                  </span>
                ) : null;
              })()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {PERMISSIONS.map(({ value, label }) => (
                <label
                  key={value}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(value)}
                    onChange={() => togglePermission(value)}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--red-primary)' }}
                  />
                  <span>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-gray)', marginLeft: 'auto' }}>{value}</span>
                </label>
              ))}
            </div>
            {selectedPermissions.length > 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-gray)', marginBottom: 8 }}>
                {selectedPermissions.length} permission{selectedPermissions.length > 1 ? 's' : ''} sélectionnée{selectedPermissions.length > 1 ? 's' : ''}
              </p>
            )}
            <button type="submit" className="btn-add" style={{ marginTop: 2 }}>
              Enregistrer les permissions
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Administrateurs;
