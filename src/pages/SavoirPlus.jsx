import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

function SavoirPlus() {
  const { lang } = useLanguage();
  const T = translations[lang].learn;

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

      {/* Comment ça fonctionne */}
      <section className="savoir-section">
        <div className="about-section-text">
          <h2>{T.howTitle}</h2>
          <p>{T.howText}</p>
          <ul style={{ listStyle: 'none', marginTop: '14px' }}>
            {T.howSteps.map(({ title, text }) => (
              <li key={title} style={{ padding: '6px 0 6px 20px', position: 'relative', fontSize: '14px', color: 'var(--text-gray)', marginBottom: '6px' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--red-primary)' }}>—</span>
                <strong style={{ color: 'var(--text-dark)' }}>{title} : </strong>{text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <img src="/images/image-section-comment.jpg" alt="Comment fonctionne RSC"
            style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '12px' }} />
        </div>
      </section>

      {/* Intégrité */}
      <section className="savoir-section alt">
        <div>
          <img src="/images/image-section-integrite.jpg" alt="Intégrité RSC"
            style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '12px' }} />
        </div>
        <div className="about-section-text">
          <h2>{T.integrityTitle}</h2>
          <p>{T.integrityText1}</p>
          <p style={{ marginTop: '14px' }}>{T.integrityText2}</p>
        </div>
      </section>

      {/* Conditions d'adhésion */}
      <section className="savoir-section">
        <div className="about-section-text">
          <h2>{T.conditionsTitle}</h2>
          <p>{T.conditionsText}</p>
          <ul className="conditions-list">
            {T.conditionsItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <img src="/images/image-section-condition.jpg" alt="Conditions RSC"
            style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '12px' }} />
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default SavoirPlus;
