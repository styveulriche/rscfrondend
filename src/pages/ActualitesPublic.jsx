import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaNewspaper, FaHeartBroken, FaCalendarAlt, FaMapMarkerAlt,
  FaArrowRight, FaUserPlus, FaSearch,
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { listArticles } from '../services/articles';
import { listDeclarations } from '../services/declarations';

/* ─── helpers ──────────────────────────────────────────────── */

const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.content)) return p.content;
  if (Array.isArray(p?.items)) return p.items;
  return [];
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' });
};

const declColor = (v) => {
  const n = v?.toUpperCase();
  if (n === 'TRAITE' || n === 'CLOTURE') return '#2e7d32';
  if (n === 'EN_COURS') return '#1565c0';
  if (n === 'REJETE' || n === 'ANNULE') return '#c62828';
  return '#f57c00';
};

const declLabel = (v) => {
  const m = { DECLARE: 'Déclarée', EN_COURS: 'En cours', TRAITE: 'Traitée', CLOTURE: 'Clôturée', REJETE: 'Rejetée', ANNULE: 'Annulée' };
  return m[v?.toUpperCase()] || v || '—';
};

/* ─── carte article ─────────────────────────────────────────── */

function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false);
  const imgUrl = article.imageUrl || article.image || null;
  const resume = article.resume || '';
  const contenu = article.contenu || '';
  const text = contenu;

  return (
    <div style={{
      background: 'white', border: '1px solid #f0f0f0', borderRadius: 14,
      overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s, transform 0.2s', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.11)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Image ou placeholder */}
      <div style={{ height: 200, background: 'linear-gradient(135deg, #8B1C1C, #C44040)', overflow: 'hidden', flexShrink: 0 }}>
        {imgUrl
          ? <img src={imgUrl} alt={article.titre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaNewspaper size={40} color="rgba(255,255,255,0.25)" />
            </div>
        }
      </div>

      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(139,28,28,0.1)', color: '#8B1C1C', padding: '2px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {article.categorie || 'Actualité'}
          </span>
          {article.nbVues != null && (
            <span style={{ fontSize: 11, color: '#bbb' }}>👁 {article.nbVues}</span>
          )}
        </div>

        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.35, color: '#1a1a1a' }}>
          {article.titre}
        </h3>

        <p style={{ margin: 0, fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 5 }}>
          <FaCalendarAlt size={10} />
          {formatDate(article.datePublication || article.createdAt || article.dateCreation)}
          {article.auteur && <> · <strong style={{ color: '#888' }}>{article.auteur}</strong></>}
        </p>

        {resume && (
          <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.6, fontStyle: 'italic' }}>{resume}</p>
        )}

        {text && (
          <>
            <p style={{ margin: 0, fontSize: 14, color: '#444', lineHeight: 1.7, flex: 1 }}>
              {expanded ? text : `${text.slice(0, 220)}${text.length > 220 ? '…' : ''}`}
            </p>
            {text.length > 220 && (
              <button type="button" onClick={() => setExpanded((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B1C1C', fontSize: 13, fontWeight: 700, padding: '4px 0 0', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}>
                {expanded ? 'Réduire' : <><FaArrowRight size={11} /> Lire la suite</>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── carte décès ───────────────────────────────────────────── */

function DecesCard({ item }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(198,40,40,0.1)',
      borderLeft: '4px solid var(--red-primary, #8B1C1C)',
      borderRadius: '0 12px 12px 0',
      padding: '14px 18px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FaHeartBroken size={13} color="#8B1C1C" />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{item.pays}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaCalendarAlt size={10} /> Décès le {formatDate(item.dateDeces)}
          </p>
          {item.lieuDeces && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaMapMarkerAlt size={10} /> {item.lieuDeces}
            </p>
          )}
        </div>
        <span style={{ background: declColor(item.statut), color: 'white', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {declLabel(item.statut)}
        </span>
      </div>
    </div>
  );
}

/* ─── composant principal ───────────────────────────────────── */

export default function ActualitesPublic() {
  const [tab, setTab] = useState('articles');

  const [articles, setArticles] = useState([]);
  const [artLoading, setArtLoading] = useState(false);
  const [artEmpty, setArtEmpty] = useState(false);

  const [deces, setDeces] = useState([]);
  const [decesLoading, setDecesLoading] = useState(false);
  const [decesPage, setDecesPage] = useState(0);
  const [decesTotalPages, setDecesTotalPages] = useState(1);

  const [artPage, setArtPage] = useState(0);
  const [artTotalPages, setArtTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [categorie, setCategorie] = useState('');

  const loadArticles = useCallback(async () => {
    setArtLoading(true);
    try {
      const params = { page: artPage, size: 12 };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (categorie) params.categorie = categorie;
      const data = await listArticles(params);
      const list = normalizeList(data);
      setArticles(list);
      setArtEmpty(list.length === 0);
      setArtTotalPages(data?.totalPages ?? 1);
    } catch {
      setArticles([]);
      setArtEmpty(true);
    } finally {
      setArtLoading(false);
    }
  }, [artPage, keyword, categorie]);

  const loadDeces = useCallback(async () => {
    setDecesLoading(true);
    try {
      const data = await listDeclarations({ page: decesPage, size: 10, sort: 'dateDeclaration,desc' });
      setDeces(normalizeList(data));
      setDecesTotalPages(data?.totalPages ?? 1);
    } catch {
      setDeces([]);
    } finally {
      setDecesLoading(false);
    }
  }, [decesPage]);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => { loadDeces(); }, [loadDeces]);

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9' }}>
      <Navbar />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #22c55e 100%)',
        padding: '60px 24px 40px',
        textAlign: 'center',
        color: 'white',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '6px 18px', marginBottom: 16, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          <FaNewspaper size={12} /> RSC — Fil d'actualités
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>
          Actualités & Communauté
        </h1>
        <p style={{ fontSize: 16, opacity: 0.9, maxWidth: 560, margin: '0 auto 28px' }}>
          Restez informés des dernières nouvelles, actualités et événements de la communauté RSC.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/inscription" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#16a34a', fontWeight: 700, borderRadius: 999, padding: '11px 24px', textDecoration: 'none', fontSize: 14, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
            <FaUserPlus size={14} /> Rejoindre RSC
          </Link>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, borderRadius: 999, padding: '11px 24px', textDecoration: 'none', fontSize: 14, border: '1px solid rgba(255,255,255,0.4)' }}>
            Se connecter
          </Link>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 16px 60px' }}>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, borderBottom: '2px solid #e5e7eb' }}>
          {[
            { key: 'articles', label: 'Actualités', icon: FaNewspaper },
            { key: 'deces',    label: 'Décès déclarés',        icon: FaHeartBroken },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              style={{
                background: 'none', border: 'none',
                borderBottom: tab === key ? '3px solid #16a34a' : '3px solid transparent',
                padding: '10px 20px', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === key ? 700 : 500,
                color: tab === key ? '#16a34a' : '#666',
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: -2, transition: 'color 0.15s',
              }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* ══ ARTICLES ══ */}
        {tab === 'articles' && (
          <>
            {/* Barre de recherche + filtre catégorie */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', position: 'relative' }}>
                <FaSearch size={12} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none' }} />
                <input
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setArtPage(0); }}
                  placeholder="Rechercher une actualité…"
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 36, paddingRight: 12, height: 42, border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', background: 'white' }}
                />
              </div>
              <select
                value={categorie}
                onChange={(e) => { setCategorie(e.target.value); setArtPage(0); }}
                style={{ flex: '0 0 180px', height: 42, border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, padding: '0 12px', background: 'white', cursor: 'pointer' }}>
                <option value="">Toutes catégories</option>
                {['Actualité', 'Communiqué', 'Événement', 'Conseil', 'Autre'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {artLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 320, borderRadius: 14, background: '#f0f0f0', animation: 'pulse 1.4s ease-in-out infinite' }} />
                ))}
              </div>
            )}
            {!artLoading && artEmpty && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <FaNewspaper size={48} style={{ marginBottom: 16, opacity: 0.15 }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 8 }}>Aucune actualité trouvée</h3>
                <p style={{ fontSize: 14, color: '#888' }}>
                  {keyword || categorie ? 'Essayez d\'autres termes de recherche.' : 'Les actualités publiées par l\'équipe RSC apparaîtront ici.'}
                </p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
            {artTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 28 }}>
                <button onClick={() => setArtPage((p) => Math.max(0, p - 1))} disabled={artPage === 0 || artLoading}
                  style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ← Précédent
                </button>
                <span style={{ fontSize: 13, color: '#666' }}>Page {artPage + 1} / {artTotalPages}</span>
                <button onClick={() => setArtPage((p) => Math.min(artTotalPages - 1, p + 1))} disabled={artPage >= artTotalPages - 1 || artLoading}
                  style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Suivant →
                </button>
              </div>
            )}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
          </>
        )}

        {/* ══ DÉCÈS ══ */}
        {tab === 'deces' && (
          <>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
              Cette liste répertorie les décès déclarés par les membres de la communauté RSC et pris en charge par notre équipe pour les démarches de rapatriement.
            </div>
            {decesLoading && (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#888' }}>Chargement…</div>
            )}
            {!decesLoading && deces.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <FaHeartBroken size={42} style={{ marginBottom: 14, opacity: 0.15 }} />
                <p style={{ fontSize: 14, color: '#888' }}>Aucun décès déclaré pour le moment.</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deces.map((d) => (
                <DecesCard key={d.id} item={{
                  pays: d.pays, dateDeces: d.dateDeces,
                  lieuDeces: d.lieuDeces, dateDeclaration: d.dateDeclaration, statut: d.statut,
                }} />
              ))}
            </div>
            {decesTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 24 }}>
                <button onClick={() => setDecesPage((p) => Math.max(0, p - 1))} disabled={decesPage === 0 || decesLoading}
                  style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Précédent
                </button>
                <span style={{ fontSize: 13, color: '#666' }}>Page {decesPage + 1} / {decesTotalPages}</span>
                <button onClick={() => setDecesPage((p) => Math.min(decesTotalPages - 1, p + 1))} disabled={decesPage >= decesTotalPages - 1 || decesLoading}
                  style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Suivant
                </button>
              </div>
            )}
          </>
        )}

        {/* CTA inscription */}
        <div style={{
          marginTop: 50, background: 'linear-gradient(135deg, #14532d, #16a34a)',
          borderRadius: 16, padding: '32px 28px', textAlign: 'center', color: 'white',
        }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Rejoignez la communauté RSC</h3>
          <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
            Créez votre compte gratuitement et accédez à tous les services : cotisations, parrainage, suivi de dossiers et bien plus.
          </p>
          <Link to="/inscription" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#16a34a', fontWeight: 700, borderRadius: 999, padding: '12px 28px', textDecoration: 'none', fontSize: 15 }}>
            <FaUserPlus size={15} /> Créer mon compte
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
