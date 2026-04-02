import { useMemo, useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaChartBar, FaWallet, FaHandHoldingHeart, FaUsers, FaUserFriends,
  FaExclamationCircle, FaSearch, FaEnvelope, FaBell, FaCog,
  FaSignOutAlt, FaUserCircle, FaBars, FaTimes, FaMapMarkerAlt,
  FaUserShield, FaUsersCog, FaClipboardList, FaLock, FaExclamationTriangle,
  FaFileInvoiceDollar,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../services/notifications';
import { isProfileIncomplete } from '../components/PrivateRoute';

const baseMenuItems = [
  { path: 'statistiques',  label: 'Statistiques',            Icon: FaChartBar },
  { path: 'finances',      label: 'Finances',                Icon: FaWallet },
  { path: 'don',           label: 'Faire un don',            Icon: FaHandHoldingHeart },
  { path: 'ayant-droit',   label: 'Mes ayants droit',        Icon: FaUsers,   userOnly: true },
  { path: 'parrainage',    label: 'Parrainage & références', Icon: FaUserFriends, userOnly: true },
  { path: 'signaler',      label: 'Signaler un décès',       Icon: FaExclamationCircle },
  { path: 'suivi',         label: 'Suivi',                   Icon: FaSearch },
];

const menuBottom = [
  { path: 'profil',        label: 'Mon profil',     Icon: FaUserCircle },
  { path: 'messagerie',    label: 'Messagerie',     Icon: FaEnvelope },
  { path: 'adresses',      label: 'Adresses',       Icon: FaMapMarkerAlt },
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

  useEffect(() => {
    // Les admins n'ont pas de notifications utilisateur sur cet endpoint
    if (!user?.id || isAdmin) return;
    const fetchUnread = async () => {
      try {
        const res = await getUnreadCount();
        if (typeof res === 'number') {
          setUnreadCount(res);
        } else if (res && typeof res === 'object') {
          const values = Object.values(res);
          setUnreadCount(values.length > 0 ? values[0] : 0);
        }
      } catch {
        // silencieux
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => clearInterval(interval);
  }, [user?.id, isAdmin]);

  const displayName = user?.nomComplet
    || [user?.prenom, user?.nom].filter(Boolean).join(' ')
    || user?.email
    || 'Utilisateur';
  const avatar = user?.photoProfile || user?.avatar || null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Role-based menu visibility for admins
  const ADMIN_ROLES_FOR = useMemo(() => Object.freeze({
    finances:               ['SUPER_ADMIN', 'ADMIN_FINANCIER'],
    don:                    ['SUPER_ADMIN', 'ADMIN_FINANCIER'],
    cotisations:            ['SUPER_ADMIN', 'ADMIN_FINANCIER'],
    adresses:               [],  // admins don't need addresses
    signaler:               ['SUPER_ADMIN', 'ADMIN_CONTENU', 'ADMIN_SUPPORT', 'MODERATEUR'],
    suivi:                  ['SUPER_ADMIN', 'ADMIN_FINANCIER', 'ADMIN_CONTENU', 'ADMIN_SUPPORT', 'ADMIN_VALIDATEUR', 'MODERATEUR'],
    statistiques:           ['SUPER_ADMIN', 'ADMIN_FINANCIER', 'ADMIN_CONTENU', 'ADMIN_SUPPORT', 'ADMIN_VALIDATEUR', 'MODERATEUR'],
    declarations:           ['SUPER_ADMIN', 'ADMIN_VALIDATEUR'],
    'gestion-utilisateurs': ['SUPER_ADMIN', 'ADMIN_SUPPORT', 'ADMIN_VALIDATEUR'],
    administrateurs:        ['SUPER_ADMIN'],
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
    if (hasRole(ADMIN_ROLES_FOR['gestion-utilisateurs'])) {
      adminLinks.push({ path: 'gestion-utilisateurs', label: 'Gestion utilisateurs', Icon: FaUsersCog });
    }
    if (isSuperAdmin) {
      adminLinks.push({ path: 'administrateurs', label: 'Gestion administrateurs', Icon: FaUserShield });
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
          {computedMenuItems.map(({ path, label, Icon }) => (
            <li key={path}>
              {profileLocked ? (
                <span style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', opacity: 0.4, cursor: 'not-allowed', fontSize: 14 }}>
                  <Icon size={15} style={{ marginRight: 10, flexShrink: 0 }} />
                  {label}
                  <FaLock size={10} style={{ marginLeft: 'auto' }} />
                </span>
              ) : (
                <Link to={`/dashboard/${path}`} className={currentPath === path ? 'active' : ''}
                  onClick={() => setSidebarOpen(false)}>
                  <Icon size={15} style={{ marginRight: 10, verticalAlign: 'middle', opacity: 0.85, flexShrink: 0 }} />
                  {label}
                </Link>
              )}
            </li>
          ))}
          <li><div className="sidebar-divider" /></li>
          {menuBottom.map(({ path, label, Icon }) => {
            const isParametres = path === 'parametres';
            const locked = profileLocked && !isParametres;
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
                    onClick={() => setSidebarOpen(false)}>
                    <Icon size={15} style={{ marginRight: 10, verticalAlign: 'middle', opacity: 0.85, flexShrink: 0 }} />
                    {label}
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
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--red-primary)', color: 'white',
                borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, lineHeight: 1,
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
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
