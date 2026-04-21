import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FaShieldAlt, FaHandHoldingHeart, FaUsers, FaBullhorn,
  FaHandsHelping, FaClipboardList, FaHandHoldingUsd,
  FaUserPlus, FaCog, FaChartLine, FaHandshake,
  FaNewspaper, FaCalendarAlt, FaArrowRight,
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';
import { listPartenairesPublic } from '../services/partenaires';
import { listDerniersArticles } from '../services/articles';
import { buildMediaUrl } from '../utils/mediaUrl';

const formatDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' });
};

const icons = [
  FaShieldAlt, FaHandHoldingHeart, FaUsers, FaBullhorn, FaHandsHelping,
  FaClipboardList, FaHandHoldingUsd, FaUserPlus, FaCog, FaChartLine,
];

function Home() {
  const { lang } = useLanguage();
  const T = translations[lang].home;
  const [partenaires, setPartenaires] = useState([]);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    listPartenairesPublic()
      .then((data) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
        setPartenaires(list.filter((p) => p.actif !== false && p.active !== false));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    listDerniersArticles()
      .then((data) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
        const articles = list.slice(0, 5);
        if (articles.length > 0) console.log('[RSC] articles API fields:', Object.keys(articles[0]), articles[0]);
        setArticles(articles);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section className="page-hero page-hero--home">
        <div className="page-hero-overlay page-hero-overlay--home" />
        <div className="page-hero-content">
          <p className="page-hero-tag">{T.heroTag}</p>
          <h1 className="page-hero-title">{T.heroTitle}</h1>
          <p className="page-hero-sub">{T.heroSub}</p>
          <div className="hero-buttons">
            <a href="#services" className="btn-outline-white">{T.discover}</a>
            <Link to="/inscription" className="btn-red">{T.start}</Link>
          </div>
        </div>
      </section>

      {/* Pourquoi RSC */}
      <section className="pourquoi-section">
        <div className="pourquoi-image">
          <img
            src="/images/image-section1.png"
            alt="Solidarité RSC"
            style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '12px' }}
          />
        </div>
        <div>
          <h2 className="section-title">{T.whyTitle}</h2>
          <h3 className="section-subtitle">{T.whySubtitle}</h3>
          <p className="section-text">
            {T.whyText1}
            <br /><br />
            {T.whyText2}
          </p>
        </div>
      </section>

      {/* Nos services */}
      <section className="services-section" id="services">
        <h2>{T.servicesTitle}</h2>
        <p style={{ color: 'var(--text-gray)', marginBottom: '50px', fontSize: '14px', maxWidth: '600px', margin: '0 auto 50px' }}>
          {T.servicesDesc}
        </p>

        {/* Top 5 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', maxWidth: '820px', margin: '0 auto 10px' }}>
          {T.services.slice(0, 5).map(({ name, desc }, i) => {
            const Icon = icons[i];
            return (
              <div className="service-item" key={name}>
                <div className="service-icon"><Icon size={20} color="var(--red-primary)" /></div>
                <span className="service-name">{name}</span>
                <span className="service-desc">{desc}</span>
              </div>
            );
          })}
        </div>

        {/* Centre RSC */}
        <div className="rsc-center-circle">RSC</div>

        {/* Bottom 5 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', maxWidth: '820px', margin: '10px auto 0' }}>
          {T.services.slice(5).map(({ name, desc }, i) => {
            const Icon = icons[i + 5];
            return (
              <div className="service-item" key={name}>
                <div className="service-icon"><Icon size={20} color="var(--red-primary)" /></div>
                <span className="service-name">{name}</span>
                <span className="service-desc">{desc}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quote */}
      <section className="quote-section">
        <blockquote>{T.quote}</blockquote>
      </section>

      {/* Actualités & Articles */}
      {articles.length > 0 && (
        <section style={{ background: '#f8f8f8', padding: '64px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* Titre section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--red-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaNewspaper size={12} /> Dernières actualités
                </p>
                <h2 style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
                  Restez informés
                </h2>
              </div>
              <Link to="/actualites"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: 'var(--red-primary)', textDecoration: 'none', border: '1.5px solid var(--red-primary)', borderRadius: 999, padding: '8px 18px', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red-primary)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--red-primary)'; }}>
                Voir tout <FaArrowRight size={11} />
              </Link>
            </div>

            {/* Grille articles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {articles.map((a) => {
                const imgUrl = buildMediaUrl(a.imageUrl || a.image || a.urlImage || a.coverImage || a.photoUrl || a.imagePath || null);
                const resume = a.resume || a.contenu || '';
                return (
                  <Link key={a.id} to="/actualites"
                    style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}>
                    {/* Image */}
                    <div style={{ height: 180, background: 'linear-gradient(135deg, var(--red-primary), var(--red-light))', overflow: 'hidden', flexShrink: 0 }}>
                      {imgUrl
                        ? <img src={imgUrl} alt={a.titre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { console.warn('[RSC] img load failed:', e.target.src); e.target.style.display = 'none'; }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaNewspaper size={36} color="rgba(255,255,255,0.3)" />
                          </div>
                      }
                    </div>
                    {/* Contenu */}
                    <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(139,28,28,0.1)', color: 'var(--red-primary)', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {a.categorie || 'Actualité'}
                        </span>
                        {formatDate(a.datePublication || a.createdAt || a.dateCreation) && (
                          <span style={{ fontSize: 11, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FaCalendarAlt size={9} />
                            {formatDate(a.datePublication || a.createdAt || a.dateCreation)}
                          </span>
                        )}
                      </div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.35 }}>
                        {a.titre}
                      </h3>
                      {resume && (
                        <p style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {resume.slice(0, 140)}{resume.length > 140 ? '…' : ''}
                        </p>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red-primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        Lire <FaArrowRight size={10} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Partenaires défilants */}
      {partenaires.length > 0 && (
        <section className="partenaires-band">
          <p className="partenaires-band__title">
            <FaHandshake size={13} style={{ marginRight: 7, verticalAlign: 'middle' }} />
            Nos partenaires
          </p>
          <div className="partenaires-track-wrapper">
            {/* Dupliquer la liste pour un défilement sans fin */}
            <div className="partenaires-track">
              {[...partenaires, ...partenaires].map((p, i) => {
                const logoUrl = buildMediaUrl(p.logoUrl || p.logo || p.logoPath);
                return (
                  <div key={i} className="partenaire-item">
                    {logoUrl
                      ? <img src={logoUrl} alt={p.nom || p.name || 'Partenaire'} onError={(e) => { e.target.style.display = 'none'; }} />
                      : null
                    }
                    <span className="partenaire-item__name">{p.nom || p.name || 'Partenaire'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

export default Home;
