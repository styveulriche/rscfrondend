import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaFilePdf, FaCalendarAlt, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import { getAvisPublic, getAvisPublicPdf } from '../services/avisDecès';

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function AvisPublic() {
  const { token } = useParams();
  const [avis, setAvis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getAvisPublic(token)
      .then((data) => setAvis(data))
      .catch(() => setError('Cet avis de décès est introuvable ou n\'est plus accessible.'))
      .finally(() => setLoading(false));
  }, [token]);

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const blob = await getAvisPublicPdf(token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avis-deces-${avis?.nomDefunt || token}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '40px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Logo / En-tête */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase' }}>
          Réseau Social Communautaire
        </div>
        <div style={{ width: 60, height: 2, background: '#c62828', margin: '10px auto 0' }} />
      </div>

      {loading && (
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, padding: 40 }}>
          Chargement de l'avis…
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(198,40,40,0.15)',
          border: '1px solid rgba(198,40,40,0.3)',
          borderRadius: 12,
          padding: '24px 32px',
          color: '#ef9a9a',
          textAlign: 'center',
          maxWidth: 480,
        }}>
          <p style={{ margin: 0, fontSize: 15 }}>{error}</p>
        </div>
      )}

      {avis && !loading && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          maxWidth: 680,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Bandeau supérieur */}
          <div style={{
            background: 'linear-gradient(135deg, #c62828, #8b0000)',
            padding: '28px 32px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, textTransform: 'uppercase' }}>
              Avis de décès
            </p>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'white' }}>
              {avis.prenomDefunt} {avis.nomDefunt}
            </h1>
            {avis.photoUrl && (
              <img
                src={avis.photoUrl}
                alt={`${avis.prenomDefunt} ${avis.nomDefunt}`}
                style={{
                  width: 100, height: 100, borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.3)',
                  objectFit: 'cover', marginTop: 16,
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          {/* Corps */}
          <div style={{ padding: '28px 32px', display: 'grid', gap: 20 }}>
            {/* Dates */}
            <div className="avis-dates-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FaCalendarAlt size={14} color="#c62828" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Date de naissance
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: 'white', fontWeight: 500 }}>
                    {formatDate(avis.dateNaissance)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FaCalendarAlt size={14} color="#c62828" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Date de décès
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: 'white', fontWeight: 500 }}>
                    {formatDate(avis.dateDeces)}
                  </p>
                </div>
              </div>
            </div>

            {/* Lieu */}
            {(avis.lieuDeces || avis.pays) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <FaMapMarkerAlt size={14} color="#c62828" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Lieu du décès
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: 'white', fontWeight: 500 }}>
                    {[avis.lieuDeces, avis.pays].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Contenu HTML */}
            {avis.contenuHtml && (
              <div style={{
                padding: '20px 24px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.7,
                fontSize: 14,
              }}
                dangerouslySetInnerHTML={{ __html: avis.contenuHtml }}
              />
            )}

            {/* Créé par */}
            {avis.creeParNom && (
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                Publié par {avis.creeParNom}
                {avis.datePublication ? ` · ${formatDate(avis.datePublication)}` : ''}
              </p>
            )}

            {/* Bouton PDF */}
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, #c62828, #8b0000)',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '12px 24px', fontSize: 14, fontWeight: 600,
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                opacity: pdfLoading ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}>
              <FaFilePdf size={14} />
              {pdfLoading ? 'Téléchargement…' : 'Télécharger le PDF'}
            </button>

            {/* Partage */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              <FaGlobe size={11} />
              Lien permanent — RSC
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
