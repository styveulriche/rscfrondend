import { useMemo, useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaChartBar, FaWallet, FaHandHoldingHeart, FaUsers, FaUserFriends,
  FaExclamationCircle, FaSearch, FaEnvelope, FaBell, FaCog,
  FaSignOutAlt, FaUserCircle, FaBars, FaTimes, FaMapMarkerAlt,
  FaUserShield, FaUsersCog, FaClipboardList, FaLock, FaExclamationTriangle,
  FaFileInvoiceDollar, FaNewspaper, FaHandHoldingUsd, FaShieldAlt, FaSlidersH, FaHandshake,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../services/notifications';
import { listMyTickets } from '../services/messages';
import { isProfileIncomplete } from '../components/PrivateRoute';

import { buildMediaUrl as buildMediaUrlUtil } from '../utils/mediaUrl';

const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.content)) return p.content;
  return [];
};

const baseMenuItems = [
  { path: 'statistiques',  label: 'Statistiques',            Icon: FaChartBar },
  { path: 'finances',      label: 'Finances',                Icon: FaWallet },
  { path: 'don',           label: 'Faire un don',            Icon: FaHandHoldingHeart },
  { path: 'actualites',    label: 'Actualités & Décès',      Icon: FaNewspaper },
  { path: 'ayant-droit',   label: 'Mes ayants droit',        Icon: FaUsers,   userOnly: true },
  { path: 'parrainage',    label: 'Parrainage & références', Icon: FaUserFriends, userOnly: true },
  { path: 'signaler',      label: 'Signaler un décès',       Icon: FaExclamationCircle },
  { path: 'suivi',         label: 'Suivi',                   Icon: FaSearch },
];

// Pour les utilisateurs réguliers : messagerie fusionnée dans notifications
const menuBottomUser = [
  { path: 'profil',        label: 'Mon profil',              Icon: FaUserCircle },
  { path: 'adresses',      label: 'Adresses',                Icon: FaMapMarkerAlt },
  { path: 'notifications', label: 'Messagerie',               Icon: FaBell },
  { path: 'parametres',    label: 'Paramètres',              Icon: FaCog },
];

// Pour les admins : messagerie et notifications restent séparées
const menuBottomAdmin = [
  { path: 'profil',        label: 'Mon profil',     Icon: FaUserCircle },
  { path: 'messagerie',    label: 'Messagerie',     Icon: FaEnvelope },
  { path: 'notifications', label: 'Notifications',  Icon: FaBell },
  { path: 'parametres',    label: 'Paramètres',     Icon: FaCog },
];


function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isSuperAdmin, hasRole } = useAuth();
  const currentPath = location.pathname.split('/').pop();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const profileLocked = !isAdmin && isProfileIncomplete(user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user?.id || isAdmin) return;
    const fetchCounts = async () => {
      try {
        // Notifications non lues
        const res = await getUnreadCount();
        if (typeof res === 'number') setUnreadCount(res);
        else if (res && typeof res === 'object') {
          const values = Object.values(res);
          setUnreadCount(values.length > 0 ? values[0] : 0);
        }
      } catch { /* silencieux */ }

      try {
        // Réponses tickets non lues
        const tickets = await listMyTickets({ page: 0, size: 50 });
        const list = normalizeList(tickets);
        setUnreadMessages(list.reduce((sum, t) => sum + (t.reponsesNonLues || 0), 0));
      } catch { /* silencieux */ }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 20000);
    return () => clearInterval(interval);
  }, [user?.id, isAdmin]);

  const displayName = user?.nomComplet
    || [user?.prenom, user?.nom].filter(Boolean).join(' ')
    || user?.email
    || 'Utilisateur';
  const rawAvatar = user?.photoProfile || user?.avatar || null;
  const avatar = buildMediaUrlUtil(rawAvatar);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Role-based menu visibility for admins
  const ADMIN_ROLES_FOR = useMemo(() => Object.freeze({
    finances:               ['SUPER_ADMIN', 'ADMIN_FINANCIER'],
    don:                    ['SUPER_ADMIN', 'ADMIN_FINANCIER'],
    cotisations:            ['SUPER_ADMIN', 'ADMIN_FINANCIER'],
    actualites:             ['SUPER_ADMIN', 'ADMIN_CONTENU', 'ADMIN_SUPPORT', 'MODERATEUR'],
    adresses:               [],  // admins don't need addresses
    signaler:               ['SUPER_ADMIN', 'ADMIN_CONTENU', 'ADMIN_SUPPORT', 'MODERATEUR'],
    suivi:                  ['SUPER_ADMIN', 'ADMIN_FINANCIER', 'ADMIN_CONTENU', 'ADMIN_SUPPORT', 'ADMIN_VALIDATEUR', 'MODERATEUR'],
    statistiques:           ['SUPER_ADMIN', 'ADMIN_FINANCIER', 'ADMIN_CONTENU', 'ADMIN_SUPPORT', 'ADMIN_VALIDATEUR', 'MODERATEUR'],
    declarations:           ['SUPER_ADMIN', 'ADMIN_VALIDATEUR'],
    'aides-financieres':    ['SUPER_ADMIN', 'ADMIN_FINANCIER'],
    'gestion-utilisateurs': ['SUPER_ADMIN', 'ADMIN_SUPPORT', 'ADMIN_VALIDATEUR'],
    administrateurs:        ['SUPER_ADMIN'],
    'parametres-systeme':   ['SUPER_ADMIN'],
    'audit-logs':           ['SUPER_ADMIN'],
  }), []);

  const computedMenuItems = useMemo(() => {
    if (!isAdmin) {
      return baseMenuItems;
    }

    // For admins: filter base items by role, exclude userOnly
    const allowedBase = baseMenuItems.filter((item) => {
      if (item.userOnly) return false;
      const allowed = ADMIN_ROLES_FOR[item.path];
      if (!allowed) return true; // no restriction defined → show to all admins
      if (allowed.length === 0) return false; // explicitly hidden for all admins
      return hasRole(allowed);
    });

    const adminLinks = [];
    if (hasRole(ADMIN_ROLES_FOR['declarations'])) {
      adminLinks.push({ path: 'declarations', label: 'Déclarations', Icon: FaClipboardList });
    }
    if (hasRole(['SUPER_ADMIN', 'ADMIN_FINANCIER'])) {
      adminLinks.push({ path: 'aides-financieres', label: 'Aides financières', Icon: FaHandHoldingUsd });
    }
    if (hasRole(ADMIN_ROLES_FOR['gestion-utilisateurs'])) {
      adminLinks.push({ path: 'gestion-utilisateurs', label: 'Gestion utilisateurs', Icon: FaUsersCog });
    }
    if (isSuperAdmin) {
      adminLinks.push({ path: 'administrateurs', label: 'Gestion administrateurs', Icon: FaUserShield });
      adminLinks.push({ path: 'partenaires', label: 'Partenaires', Icon: FaHandshake });
      adminLinks.push({ path: 'parametres-systeme', label: 'Paramètres système', Icon: FaSlidersH });
      adminLinks.push({ path: 'audit-logs', label: 'Audit Logs', Icon: FaShieldAlt });
    }

    const insertIndex = allowedBase.findIndex((item) => item.path === 'signaler');
    if (insertIndex >= 0) {
      return [...allowedBase.slice(0, insertIndex), ...adminLinks, ...allowedBase.slice(insertIndex)];
    }
    return [...allowedBase, ...adminLinks];
  }, [isAdmin, isSuperAdmin, hasRole, ADMIN_ROLES_FOR]);

  return (
    <div className="dashboard-page">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        {/* Avatar + nom */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {avatar
              ? <img src={avatar} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <FaUserCircle size={46} color="rgba(255,255,255,0.7)" />
            }
          </div>
          <p className="sidebar-username">{displayName}</p>
        </div>

        <ul className="sidebar-menu">
          {computedMenuItems.map(({ path, label, Icon }) => {
            const isActu = path === 'actualites';
            return (
              <li key={path}>
                {profileLocked ? (
                  <span style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', opacity: 0.4, cursor: 'not-allowed', fontSize: 14 }}>
                    <Icon size={15} style={{ marginRight: 10, flexShrink: 0 }} />
                    {label}
                    <FaLock size={10} style={{ marginLeft: 'auto' }} />
                  </span>
                ) : isActu ? (
                  <Link
                    to="/dashboard/actualites"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      margin: '6px 10px', padding: '9px 14px',
                      borderRadius: 10,
                      background: currentPath === 'actualites' ? '#15803d' : '#16a34a',
                      color: 'white', fontWeight: 700, fontSize: 13,
                      textDecoration: 'none',
                      animation: 'navActuPulse 1.4s ease-in-out infinite',
                      boxShadow: '0 0 0 0 rgba(22,163,74,0.7)',
                    }}
                  >
                    <Icon size={15} style={{ marginRight: 10, flexShrink: 0 }} />
                    {label}
                    <span style={{
                      marginLeft: 'auto', width: 8, height: 8,
                      borderRadius: '50%', background: 'white',
                      animation: 'navActuDot 1.4s ease-in-out infinite',
                      flexShrink: 0,
                    }} />
                  </Link>
                ) : (
                  <Link to={`/dashboard/${path}`} className={currentPath === path ? 'active' : ''}
                    onClick={() => setSidebarOpen(false)}>
                    <Icon size={15} style={{ marginRight: 10, verticalAlign: 'middle', opacity: 0.85, flexShrink: 0 }} />
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
          <li><div className="sidebar-divider" /></li>
          {(isAdmin ? menuBottomAdmin : menuBottomUser).map(({ path, label, Icon }) => {
            const isParametres = path === 'parametres';
            const locked = profileLocked && !isParametres;
            // Badge combiné : sur l'entrée notifications (utilisateurs) ou messagerie (admins)
            const showBadge = !isAdmin && path === 'notifications'
              ? unreadCount + unreadMessages
              : 0;
            return (
              <li key={path}>
                {locked ? (
                  <span style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', opacity: 0.4, cursor: 'not-allowed', fontSize: 14 }}>
                    <Icon size={15} style={{ marginRight: 10, flexShrink: 0 }} />
                    {label}
                    <FaLock size={10} style={{ marginLeft: 'auto' }} />
                  </span>
                ) : (
                  <Link to={`/dashboard/${path}`} className={currentPath === path ? 'active' : ''}
                    onClick={() => setSidebarOpen(false)}
                    style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon size={15} style={{ marginRight: 10, verticalAlign: 'middle', opacity: 0.85, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {showBadge > 0 && (
                      <span style={{
                        background: 'var(--red-primary)', color: 'white',
                        borderRadius: '50%', minWidth: 18, height: 18,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, padding: '0 3px', marginLeft: 4,
                      }}>
                        {showBadge > 99 ? '99+' : showBadge}
                      </span>
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="sidebar-bottom">
          <button className="btn-logout" onClick={handleLogout}>
            <FaSignOutAlt size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <button className="dashboard-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
          <div style={{ flex: 1 }} />
          <Link to="/dashboard/notifications" style={{ textDecoration: 'none', position: 'relative', display: 'inline-flex' }}>
            <FaBell size={20} style={{ color: 'var(--text-gray)', cursor: 'pointer' }} />
            {(unreadCount + unreadMessages) > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--red-primary)', color: 'white',
                borderRadius: '50%', minWidth: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, lineHeight: 1, padding: '0 2px',
              }}>
                {(unreadCount + unreadMessages) > 99 ? '99+' : (unreadCount + unreadMessages)}
              </span>
            )}
          </Link>
          <div className="header-user">
            <span className="header-username">{displayName}</span>
            <div className="user-avatar">
              {avatar
                ? <img src={avatar} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <FaUserCircle size={28} color="white" />
              }
            </div>
          </div>
        </header>

        {profileLocked && (
          <div style={{
            background: 'linear-gradient(135deg, #8B1C1C, #C44040)',
            color: 'white',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <FaExclamationTriangle size={16} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, flex: 1 }}>
              <strong>Profil incomplet.</strong> Veuillez renseigner vos informations pour accéder à toutes les fonctionnalités RSC.
            </p>
          </div>
        )}

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
