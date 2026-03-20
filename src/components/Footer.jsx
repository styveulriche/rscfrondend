import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

function Footer() {
  const { lang } = useLanguage();
  const T = translations[lang].footer;

  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="logo-circle">RSC</div>
          <p>{T.desc}</p>
        </div>

        <div className="footer-col">
          <h4>{T.quickLinks}</h4>
          <ul>
            <li><Link to="/a-propos">{T.about}</Link></li>
            <li><a href="#services">{T.services}</a></li>
            <li><a href="#dons">{T.donate}</a></li>
            <li><Link to="/login">{T.login}</Link></li>
            <li><Link to="/inscription">{T.register}</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>{T.contact}</h4>
          <p style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <FaMapMarkerAlt size={13} style={{ marginTop: 2, flexShrink: 0, color: 'var(--pink-light)' }} />
              783 rue Jean-François, Suite 1A, Montréal, QC, H3K 2L2
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaPhone size={12} style={{ flexShrink: 0, color: 'var(--pink-light)' }} />
              +1 833 807-0595
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaEnvelope size={12} style={{ flexShrink: 0, color: 'var(--pink-light)' }} />
              contact@retauxsources.org
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaGlobe size={12} style={{ flexShrink: 0, color: 'var(--pink-light)' }} />
              www.retauxsources.org
            </span>
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>{T.copyright}</p>
      </div>
    </footer>
  );
}

export default Footer;
