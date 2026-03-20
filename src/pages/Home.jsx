import { Link } from 'react-router-dom';
import {
  FaShieldAlt, FaHandHoldingHeart, FaUsers, FaBullhorn,
  FaHandsHelping, FaClipboardList, FaHandHoldingUsd,
  FaUserPlus, FaCog, FaChartLine
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const icons = [
  FaShieldAlt, FaHandHoldingHeart, FaUsers, FaBullhorn, FaHandsHelping,
  FaClipboardList, FaHandHoldingUsd, FaUserPlus, FaCog, FaChartLine,
];

function Home() {
  const { lang } = useLanguage();
  const T = translations[lang].home;

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

      <Footer />
    </div>
  );
}

export default Home;
