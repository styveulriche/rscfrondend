import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe, FaFacebook, FaInstagram, FaTwitter, FaWhatsapp, FaLinkedin } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const PARTENAIRES = [
  { name: 'Partenaire 1', logo: null },
  { name: 'Partenaire 2', logo: null },
  { name: 'Partenaire 3', logo: null },
];

const SOCIAL_LINKS = [
  { icon: FaFacebook,  href: 'https://facebook.com/retauxsources',  label: 'Facebook',  color: '#1877F2' },
  { icon: FaInstagram, href: 'https://instagram.com/retauxsources', label: 'Instagram', color: '#E1306C' },
  { icon: FaTwitter,   href: 'https://twitter.com/retauxsources',   label: 'Twitter',   color: '#1DA1F2' },
  { icon: FaLinkedin,  href: 'https://linkedin.com/company/rsc',    label: 'LinkedIn',  color: '#0A66C2' },
];

const WHATSAPP_NUMBER = '+18338070595';

function Footer() {
  const { lang } = useLanguage();
  const T = translations[lang].footer;

  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="logo-circle">RSC</div>
          <p>{T.desc}</p>
          {/* Réseaux sociaux */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {SOCIAL_LINKS.map(({ icon: Icon, href, label, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', textDecoration: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = color; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}>
                <Icon size={16} color="white" />
              </a>
            ))}
          </div>
          {/* Bouton WhatsApp */}
          <a href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#25D366', color: 'white', borderRadius: 8, padding: '8px 16px', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FaWhatsapp size={16} />
            Nous contacter sur WhatsApp
          </a>
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

        {/* Partenaires */}
        <div className="footer-col" style={{ gridColumn: '1 / -1' }}>
          <h4>Nos Partenaires</h4>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {PARTENAIRES.map((p) => (
              <div key={p.name} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 20px', fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
                {p.logo ? <img src={p.logo} alt={p.name} style={{ height: 32 }} /> : p.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>{T.copyright}</p>
      </div>
    </footer>
  );
}

export default Footer;
