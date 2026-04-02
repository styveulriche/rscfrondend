import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaNewspaper } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import t from '../i18n/translations';

function Navbar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { lang, setLanguage } = useLanguage();
  const T = t[lang].nav;
  const path = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDons = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    navigate(user ? '/dashboard/don' : '/login');
  };

  const links = [
    { to: '/',              label: T.home,     exact: true },
    { to: '/a-propos',      label: T.about,    exact: false },
    { to: '/savoir-plus',   label: T.learn,    exact: false },
    { to: '/nos-services',  label: T.services, exact: false },
    { isDons: true,         label: T.donate },
    { to: '/contact',       label: T.contact,  exact: false },
    { isActualites: true,   label: 'Actualités' },
  ];

  const isActive = (to, exact) => exact ? path === to : path.startsWith(to);

  const renderLink = (l, mobile = false) => {
    if (l.isDons) return (
      <li key="dons">
        <a href="#dons" onClick={handleDons}
          className={path === '/dashboard/don' ? 'active' : ''}>
          {l.label}
        </a>
      </li>
    );
    if (l.isActualites) {
      return (
        <li key="actualites">
          <Link
            to="/actualites"
            onClick={() => mobile && setMenuOpen(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: '#16a34a',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              padding: '7px 16px',
              borderRadius: 999,
              textDecoration: 'none',
              letterSpacing: 0.3,
              animation: 'navActuPulse 1.4s ease-in-out infinite',
              boxShadow: '0 0 0 0 rgba(22,163,74,0.7)',
            }}
          >
            <FaNewspaper size={13} />
            {l.label}
            <span style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#fff',
              animation: 'navActuDot 1.4s ease-in-out infinite',
              flexShrink: 0,
            }} />
          </Link>
        </li>
      );
    }
    return (
      <li key={l.to}>
        <Link to={l.to} className={isActive(l.to, l.exact) ? 'active' : ''}
          onClick={() => mobile && setMenuOpen(false)}>
          {l.label}
        </Link>
      </li>
    );
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div className="logo-circle">RSC</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--red-primary)', letterSpacing: 0.5 }}>RETOUR AUX SOURCES</span>
          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-gray)', letterSpacing: 1 }}>CANADA</span>
        </div>
      </Link>

      {/* Desktop links */}
      <ul className="navbar-links">
        {links.map((l) => renderLink(l))}
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Language switcher */}
        <div className="lang-switcher">
          <button className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLanguage('fr')}>FR</button>
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
        </div>

        {user ? (
          <Link to="/dashboard" className="btn-connect">{T.mySpace}</Link>
        ) : (
          <Link to="/login" className="btn-connect">{T.login}</Link>
        )}

        <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {links.map((l) => {
            if (l.isDons) return (
              <a key="dons" href="#dons" onClick={handleDons}>{l.label}</a>
            );
            if (l.isActualites) {
              return (
                <Link key="actualites" to="/actualites"
                  onClick={() => setMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#16a34a', color: '#fff', fontWeight: 700, borderRadius: 8, padding: '10px 16px', textDecoration: 'none', animation: 'navActuPulse 1.4s ease-in-out infinite' }}>
                  <FaNewspaper size={14} />
                  {l.label}
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'navActuDot 1.4s ease-in-out infinite' }} />
                </Link>
              );
            }
            return (
              <Link key={l.to} to={l.to} className={isActive(l.to, l.exact) ? 'active' : ''}
                onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            );
          })}
          {/* Language switcher mobile */}
          <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--pink-very-light)' }}>
            <button className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => { setLanguage('fr'); setMenuOpen(false); }}>FR</button>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => { setLanguage('en'); setMenuOpen(false); }}>EN</button>
          </div>
          {user ? (
            <Link to="/dashboard" className="btn-connect" style={{ marginTop: 8, textAlign: 'center' }}
              onClick={() => setMenuOpen(false)}>{T.mySpace}</Link>
          ) : (
            <Link to="/login" className="btn-connect" style={{ marginTop: 8, textAlign: 'center' }}
              onClick={() => setMenuOpen(false)}>{T.login}</Link>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
