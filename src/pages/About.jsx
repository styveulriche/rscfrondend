import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

function About() {
  const { lang } = useLanguage();
  const T = translations[lang].about;

  return (
    <div>
      <Navbar />

      <section className="page-hero">
        <div className="page-hero-overlay" />
        <div className="page-hero-content">
          <p className="page-hero-tag">{T.heroTag}</p>
          <h1 className="page-hero-title">{T.heroTitle}</h1>
          <p className="page-hero-sub">{T.heroSub}</p>
        </div>
      </section>

      {/* C'est quoi RSC */}
      <section className="about-section">
        <div className="about-section-text">
          <h2>{T.whatTitle}</h2>
          <p>{T.whatText1}<br /><br />{T.whatText2}</p>
        </div>
        <div>
          <img src="/images/image-section1.png" alt="RSC solidarité"
            style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '12px' }} />
        </div>
      </section>

      {/* Notre mission */}
      <section className="about-section bg-light">
        <div>
          <img src="/images/mission.jpg" alt="Notre mission RSC"
            style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '12px' }} />
        </div>
        <div className="about-section-text">
          <h2>{T.missionTitle}</h2>
          <p>{T.missionText}</p>
          <p style={{ marginTop: '14px' }}>{T.missionIntro}</p>
          <ul>{T.missionItems.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>

      {/* Nos objectifs */}
      <section className="about-section">
        <div className="about-section-text">
          <h2>{T.objectivesTitle}</h2>
          <p><strong>{T.objectivesMain}</strong><br />{T.objectivesMainText}</p>
          <p style={{ marginTop: '14px' }}><strong>{T.objectivesSecondary}</strong></p>
          <ul>{T.objectivesItems.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <img src="/images/objectifs.png" alt="Nos objectifs RSC"
            style={{ width: '100%', height: '300px', objectFit: 'contain', borderRadius: '12px', background: '#fdf5f5', padding: '20px' }} />
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default About;
