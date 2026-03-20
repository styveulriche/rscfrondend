import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
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
      <Link to="/" className="navbar-logo">
        <div className="logo-circle">RSC</div>
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
