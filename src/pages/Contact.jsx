import { useState } from 'react';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe, FaCheckCircle, FaPaperPlane } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import translations from '../i18n/translations';

const contactIcons = [FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe];

function Contact() {
  const { lang } = useLanguage();
  const T = translations[lang].contact;

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent]         = useState(false);
  const [sending, setSending]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    }, 1200);
  };

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
        </div>
      </section>

      {/* Contenu principal */}
      <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 0 }}>

        {/* Infos de contact */}
        <div className="contact-info-side" style={{ background: 'linear-gradient(160deg, #2a0606 0%, #5C1010 100%)' }}>
          <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{T.coordTitle}</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 40 }}>{T.coordDesc}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {T.contactInfo.map(({ label, value }, i) => {
              const Icon = contactIcons[i];
              return (
                <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color="white" />
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
                    <p style={{ color: 'white', fontSize: 14, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Horaires */}
          <div style={{ marginTop: 48, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{T.hoursTitle}</h3>
            {T.hours.map(({ j, h }) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{j}</span>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <div className="contact-form-side" style={{ background: 'var(--pink-ultra-light)' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 8 }}>{T.formTitle}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-gray)', marginBottom: 32 }}>{T.formDesc}</p>

          {sent ? (
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
              <FaCheckCircle size={48} color="#2e7d32" style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2e7d32', marginBottom: 8 }}>{T.successTitle}</h3>
              <p style={{ fontSize: 14, color: '#388e3c' }}>{T.successText}</p>
              <button onClick={() => setSent(false)}
                style={{ marginTop: 20, background: 'var(--red-primary)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {T.anotherMsg}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row-2">
                <div>
                  <label className="settings-label">{T.labelName}</label>
                  <input className="form-input" type="text" placeholder={T.placeName}
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="settings-label">{T.labelEmail}</label>
                  <input className="form-input" type="email" placeholder={T.placeEmail}
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="settings-label">{T.labelSubject}</label>
                <input className="form-input" type="text" placeholder={T.placeSubject}
                  value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div>
                <label className="settings-label">{T.labelMessage}</label>
                <textarea className="form-input" rows={6} placeholder={T.placeMessage}
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={{ resize: 'vertical' }} required />
              </div>
              <button type="submit" className="btn-add"
                style={{ padding: '14px 40px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', opacity: sending ? 0.7 : 1 }}
                disabled={sending}>
                <FaPaperPlane size={14} />
                {sending ? T.sending : T.sendBtn}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Contact;
