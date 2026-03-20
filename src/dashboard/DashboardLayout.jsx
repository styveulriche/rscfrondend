import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FaChartBar, FaWallet, FaHandHoldingHeart, FaUsers, FaUserFriends,
  FaExclamationCircle, FaSearch, FaEnvelope, FaBell, FaCog,
  FaSignOutAlt, FaUserCircle, FaBars, FaTimes, FaMapMarkerAlt,
  FaUserShield, FaUsersCog, FaClipboardList,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const baseMenuItems = [
  { path: 'statistiques',  label: 'Statistiques',            Icon: FaChartBar },
  { path: 'finances',      label: 'Finances',                Icon: FaWallet },
  { path: 'don',           label: 'Faire un don',            Icon: FaHandHoldingHeart },
  { path: 'adresses',      label: 'Adresses',                Icon: FaMapMarkerAlt },
  { path: 'ayant-droit',   label: 'Mes ayants droit',        Icon: FaUsers },
  { path: 'parrainage',    label: 'Parrainage & références', Icon: FaUserFriends },
  { path: 'signaler',      label: 'Signaler événement',      Icon: FaExclamationCircle },
  { path: 'suivi',         label: 'Suivi',                   Icon: FaSearch },
];

const menuBottom = [
  { path: 'profil',        label: 'Mon profil',     Icon: FaUserCircle },
  { path: 'messagerie',    label: 'Messagerie',    Icon: FaEnvelope },
  { path: 'notifications', label: 'Notifications', Icon: FaBell },
  { path: 'parametres',    label: 'Paramètres',    Icon: FaCog },
];

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const currentPath = location.pathname.split('/').pop();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = user?.nomComplet
    || [user?.prenom, user?.nom].filter(Boolean).join(' ')
    || user?.email
    || 'Utilisateur';
  const avatar = user?.photoProfile || user?.avatar || null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const computedMenuItems = useMemo(() => {
    const items = [...baseMenuItems];
    if (isAdmin) {
      const adminLinks = [
        { path: 'declarations', label: 'Déclarations', Icon: FaClipboardList },
        { path: 'gestion-utilisateurs', label: 'Gestion utilisateurs', Icon: FaUsersCog },
      ];
      if (isSuperAdmin) {
        adminLinks.push({ path: 'administrateurs', label: 'Gestion administrateurs', Icon: FaUserShield });
      }
      const insertIndex = items.findIndex((item) => item.path === 'signaler');
      if (insertIndex >= 0) {
        items.splice(insertIndex, 0, ...adminLinks);
      } else {
        items.push(...adminLinks);
      }
    }
    return items;
  }, [isAdmin, isSuperAdmin]);

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
              <Link to={`/dashboard/${path}`} className={currentPath === path ? 'active' : ''}
                onClick={() => setSidebarOpen(false)}>
                <Icon size={15} style={{ marginRight: 10, verticalAlign: 'middle', opacity: 0.85, flexShrink: 0 }} />
                {label}
              </Link>
            </li>
          ))}
          <li><div className="sidebar-divider" /></li>
          {menuBottom.map(({ path, label, Icon }) => (
            <li key={path}>
              <Link to={`/dashboard/${path}`} className={currentPath === path ? 'active' : ''}
                onClick={() => setSidebarOpen(false)}>
                <Icon size={15} style={{ marginRight: 10, verticalAlign: 'middle', opacity: 0.85, flexShrink: 0 }} />
                {label}
              </Link>
            </li>
          ))}
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
          <Link to="/dashboard/notifications" style={{ textDecoration: 'none' }}>
            <FaBell size={20} style={{ color: 'var(--text-gray)', cursor: 'pointer' }} />
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

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
