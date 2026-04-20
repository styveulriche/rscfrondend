import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe, FaFacebook, FaInstagram, FaTwitter, FaWhatsapp, FaLinkedin } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import { getSocialLinks } from '../services/public';
import { listPartenairesPublic } from '../services/partenaires';
import { buildMediaUrl } from '../utils/mediaUrl';

const PLATFORM_META = {
  facebook:  { icon: FaFacebook,  color: '#1877F2', label: 'Facebook'  },
  instagram: { icon: FaInstagram, color: '#E1306C', label: 'Instagram' },
  twitter:   { icon: FaTwitter,   color: '#1DA1F2', label: 'Twitter'   },
  linkedin:  { icon: FaLinkedin,  color: '#0A66C2', label: 'LinkedIn'  },
};

const SOCIAL_LINKS_FALLBACK = [
  { icon: FaFacebook,  href: 'https://facebook.com/retauxsources',  label: 'Facebook',  color: '#1877F2' },
  { icon: FaInstagram, href: 'https://instagram.com/retauxsources', label: 'Instagram', color: '#E1306C' },
  { icon: FaTwitter,   href: 'https://twitter.com/retauxsources',   label: 'Twitter',   color: '#1DA1F2' },
  { icon: FaLinkedin,  href: 'https://linkedin.com/company/rsc',    label: 'LinkedIn',  color: '#0A66C2' },
];

const WHATSAPP_NUMBER = '+18338070595';

function Footer() {
  const { lang } = useLanguage();
  const T = translations[lang].footer;
  const [socialLinks, setSocialLinks] = useState(SOCIAL_LINKS_FALLBACK);
  const [partenaires, setPartenaires] = useState([]);

  useEffect(() => {
    listPartenairesPublic()
      .then((data) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
        setPartenaires(list.filter((p) => p.actif !== false && p.active !== false));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getSocialLinks()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          const mapped = list
            .filter((s) => s.actif !== false && s.active !== false)
            .map((s) => {
              const platform = (s.platform || s.reseau || s.type || '').toLowerCase();
              const meta = PLATFORM_META[platform] || {};
              return {
                icon: meta.icon || FaGlobe,
                href: s.url || s.lien || s.href || '#',
                label: s.label || meta.label || platform,
                color: s.color || meta.color || '#888',
              };
            })
            .filter((s) => s.icon);
          if (mapped.length > 0) setSocialLinks(mapped);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="footer" id="contact">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="logo-circle">RSC</div>
          <p>{T.desc}</p>
          {/* Réseaux sociaux */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {socialLinks.map(({ icon: Icon, href, label, color }) => (
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

      </div>

      {/* Partenaires — bande pleine largeur */}
      {partenaires.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '20px 40px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>
            Nos partenaires
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', alignItems: 'center' }}>
            {partenaires.map((p) => {
              const logoUrl = buildMediaUrl(p.logoUrl || p.logo || p.logoPath);
              const name = p.nom || p.name || 'Partenaire';
              return (
                <div key={p.id || name}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 14px' }}>
                  {logoUrl && (
                    <img src={logoUrl} alt={name}
                      style={{ height: 24, maxWidth: 60, objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="footer-bottom">
        <p>{T.copyright}</p>
      </div>
    </footer>
  );
}

export default Footer;
