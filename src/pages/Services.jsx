import { Link } from 'react-router-dom';
import {
  FaShieldAlt, FaHandHoldingHeart, FaUsers, FaBullhorn,
  FaHandsHelping, FaClipboardList, FaHandHoldingUsd,
  FaUserPlus, FaCog, FaChartLine, FaArrowRight
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const icons   = [FaShieldAlt, FaHandHoldingHeart, FaUsers, FaBullhorn, FaHandsHelping, FaClipboardList, FaHandHoldingUsd, FaUserPlus, FaCog, FaChartLine];
const colors  = ['#8B1C1C','#A52020','#C44040','#8B1C1C','#A52020','#C44040','#8B1C1C','#A52020','#C44040','#8B1C1C'];

function Services() {
  const { lang } = useLanguage();
  const T = translations[lang].services;

  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section className="page-hero">
        <div className="page-hero-overlay" />
        <div className="page-hero-content">
          <p className="page-hero-tag">{T.heroTag}</p>
          <h1 className="page-hero-title">{T.heroTitle}</h1>
          <p className="page-hero-sub">{T.heroSub}</p>
          <Link to="/inscription" className="btn-red">{T.heroBtn}</Link>
        </div>
      </section>

      {/* Intro */}
      <div style={{ background: 'var(--pink-ultra-light)', padding: '50px 70px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 16 }}>{T.introTitle}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-gray)', maxWidth: 700, margin: '0 auto', lineHeight: 1.8 }}>{T.introText}</p>
      </div>

      {/* Cards grid */}
      <div style={{ padding: '60px 70px', background: 'white' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
          {T.items.map(({ name, short, desc }, i) => {
            const Icon = icons[i];
            return (
              <div key={name} className="service-card">
                <div className="service-card-icon" style={{ background: colors[i] }}>
                  <Icon size={28} color="white" />
                </div>
                <div className="service-card-body">
                  <h3 className="service-card-title">{name}</h3>
                  <p className="service-card-short">{short}</p>
                  <p className="service-card-desc">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <section className="quote-section">
        <blockquote style={{ marginBottom: 28 }}>{T.quote}</blockquote>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/inscription" className="btn-outline-white">{T.createAccount}</Link>
          <Link to="/login" className="btn-red" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {T.connect} <FaArrowRight size={13} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Services;
