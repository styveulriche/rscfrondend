import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaNewspaper, FaHeartBroken, FaCalendarAlt, FaMapMarkerAlt,
  FaArrowRight, FaSearch, FaSyncAlt,
} from 'react-icons/fa';
import { listArticles } from '../services/articles';
import { listDeclarations } from '../services/declarations';

/* ─── helpers ──────────────────────────────────────────────── */

const normalizeList = (p) => {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.content)) return p.content;
  return [];
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v
    : d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' });
};

const declLabel = (v) => {
  const m = { DECLARE: 'Déclarée', EN_COURS: 'En cours', TRAITE: 'Traitée', CLOTURE: 'Clôturée', REJETE: 'Rejetée', ANNULE: 'Annulée' };
  return m[v?.toUpperCase()] || v || '—';
};

const declColor = (v) => {
  const n = v?.toUpperCase();
  if (n === 'TRAITE' || n === 'CLOTURE') return { bg: 'rgba(46,125,50,0.2)', color: '#66bb6a' };
  if (n === 'EN_COURS') return { bg: 'rgba(21,101,192,0.2)', color: '#42a5f5' };
  if (n === 'REJETE' || n === 'ANNULE') return { bg: 'rgba(198,40,40,0.2)', color: '#ef5350' };
  return { bg: 'rgba(245,124,0,0.2)', color: '#ffa726' };
};

const CATEGORIES = ['Actualité', 'Communiqué', 'Événement', 'Conseil', 'Autre'];

/* ─── carte article ─────────────────────────────────────────── */

function ArticleCard({ article, onExpand, expanded }) {
  const imgUrl = article.imageUrl || article.image || null;
  const resume = article.resume || '';
  const contenu = article.contenu || '';

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 14, overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)',
      display: 'flex', flexDirection: 'column',
      transition: 'border-color 0.2s, background 0.2s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(139,28,28,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>

    {/* Image */}
    <div style={{ height: 180, background: 'linear-gradient(135deg, var(--red-dark), var(--red-primary))', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
      {imgUrl
        ? <img src={imgUrl} alt={article.titre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaNewspaper size={38} color="rgba(255,255,255,0.2)" />
          </div>
      }
      {/* Badge catégorie superposé */}
      <span style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.9)',
        fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        backdropFilter: 'blur(4px)',
      }}>
        {article.categorie || 'Actualité'}
      </span>
    </div>

    {/* Contenu */}
    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <FaCalendarAlt size={9} />
        {formatDate(article.datePublication || article.createdAt || article.dateCreation)}
        {article.auteur && <> · <span style={{ color: 'rgba(255,255,255,0.6)' }}>{article.auteur}</span></>}
        {article.nbVues != null && <> · 👁 {article.nbVues}</>}
      </p>

      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: 'rgba(255,255,255,0.92)' }}>
        {article.titre}
      </h3>

      {resume && (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, fontStyle: 'italic' }}>
          {resume}
        </p>
      )}

      {contenu && (
        <>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, flex: 1 }}>
            {expanded ? contenu : `${contenu.slice(0, 200)}${contenu.length > 200 ? '…' : ''}`}
          </p>
          {contenu.length > 200 && (
            <button type="button" onClick={() => onExpand(article.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pink-light)', fontSize: 12, fontWeight: 700, padding: 0, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5 }}>
              {expanded ? 'Réduire' : <><FaArrowRight size={10} /> Lire la suite</>}
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
  const { bg, color } = declColor(item.statut);
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: '3px solid var(--red-primary)',
      borderRadius: '0 10px 10px 0',
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FaHeartBroken size={12} color="var(--red-primary)" />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{item.pays}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <FaCalendarAlt size={9} /> Décès le {formatDate(item.dateDeces)}
          </p>
          {item.lieuDeces && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <FaMapMarkerAlt size={9} /> {item.lieuDeces}
            </p>
          )}
        </div>
        <span style={{ background: bg, color, borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {declLabel(item.statut)}
        </span>
      </div>
    </div>
  );
}

/* ─── squelette de chargement ───────────────────────────────── */

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 320, borderRadius: 14, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.4s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );
}

/* ─── composant principal ───────────────────────────────────── */

const TABS = [
  { key: 'articles', label: 'Actualités', Icon: FaNewspaper },
  { key: 'deces',    label: 'Décès déclarés',        Icon: FaHeartBroken },
];

export default function ActualitesDashboard() {
  const [tab, setTab] = useState('articles');

  /* Articles */
  const [articles, setArticles]     = useState([]);
  const [artLoading, setArtLoading] = useState(false);
  const [artPage, setArtPage]       = useState(0);
  const [artTotal, setArtTotal]     = useState(1);
  const [keyword, setKeyword]       = useState('');
  const [categorie, setCategorie]   = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const debounceRef = useRef(null);

  /* Décès */
  const [deces, setDeces]             = useState([]);
  const [decesLoading, setDecesLoading] = useState(false);
  const [decesPage, setDecesPage]     = useState(0);
  const [decesTotal, setDecesTotal]   = useState(1);

  /* ── fetch articles ── */
  const loadArticles = useCallback(async () => {
    setArtLoading(true);
    try {
      const params = { page: artPage, size: 9 };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (categorie)       params.categorie = categorie;
      const data = await listArticles(params);
      setArticles(normalizeList(data));
      setArtTotal(data?.totalPages ?? 1);
    } catch {
      setArticles([]);
    } finally {
      setArtLoading(false);
    }
  }, [artPage, keyword, categorie]);

  /* ── fetch décès ── */
  const loadDeces = useCallback(async () => {
    setDecesLoading(true);
    try {
      const data = await listDeclarations({ page: decesPage, size: 10, sort: 'dateDeclaration,desc' });
      setDeces(normalizeList(data));
      setDecesTotal(data?.totalPages ?? 1);
    } catch {
      setDeces([]);
    } finally {
      setDecesLoading(false);
    }
  }, [decesPage]);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => { if (tab === 'deces') loadDeces(); }, [tab, loadDeces]);

  /* Debounce recherche */
  const handleKeyword = (val) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setKeyword(val); setArtPage(0); }, 400);
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="content-card">
      {/* Onglets */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              background: 'none', border: 'none',
              borderBottom: tab === key ? '3px solid var(--red-primary)' : '3px solid transparent',
              padding: '10px 20px', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === key ? 700 : 500,
              color: tab === key ? 'var(--pink-light)' : 'rgba(255,255,255,0.45)',
              display: 'flex', alignItems: 'center', gap: 7,
              marginBottom: -2, transition: 'color 0.15s',
            }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ══ ARTICLES ══ */}
      {tab === 'articles' && (
        <>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ flex: '1 1 220px', position: 'relative' }}>
              <FaSearch size={11} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input
                className="form-input"
                placeholder="Rechercher une actualité…"
                style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
                onChange={(e) => handleKeyword(e.target.value)}
              />
            </div>
            <select className="form-input" value={categorie}
              onChange={(e) => { setCategorie(e.target.value); setArtPage(0); }}
              style={{ flex: '0 0 170px' }}>
              <option value="">Toutes catégories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn-small" type="button" onClick={loadArticles} disabled={artLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaSyncAlt size={11} style={{ animation: artLoading ? 'spin 1s linear infinite' : 'none' }} />
              {artLoading ? '…' : 'Actualiser'}
            </button>
          </div>

          {artLoading
            ? <Skeleton />
            : articles.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.3)' }}>
                  <FaNewspaper size={42} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: 14 }}>Aucune actualité publiée pour le moment.</p>
                </div>
              )
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
                  {articles.map((a) => (
                    <ArticleCard key={a.id} article={a}
                      expanded={expandedId === a.id}
                      onExpand={toggleExpand} />
                  ))}
                </div>
              )
          }

          {artTotal > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 24 }}>
              <button className="btn-small" onClick={() => setArtPage((p) => Math.max(0, p - 1))} disabled={artPage === 0 || artLoading}>← Précédent</button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Page {artPage + 1} / {artTotal}</span>
              <button className="btn-small" onClick={() => setArtPage((p) => Math.min(artTotal - 1, p + 1))} disabled={artPage >= artTotal - 1 || artLoading}>Suivant →</button>
            </div>
          )}
        </>
      )}

      {/* ══ DÉCÈS ══ */}
      {tab === 'deces' && (
        <>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(139,28,28,0.12)', borderLeft: '3px solid var(--red-primary)', marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            Cette liste répertorie les décès déclarés par les membres de la communauté RSC et pris en charge par notre équipe.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn-small" type="button" onClick={loadDeces} disabled={decesLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaSyncAlt size={11} style={{ animation: decesLoading ? 'spin 1s linear infinite' : 'none' }} />
              {decesLoading ? '…' : 'Actualiser'}
            </button>
          </div>

          {decesLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 80, borderRadius: 10, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          )}

          {!decesLoading && deces.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
              <FaHeartBroken size={36} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Aucun décès déclaré pour le moment.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {deces.map((d, i) => (
              <DecesCard key={d.id ?? i} item={d} />
            ))}
          </div>

          {decesTotal > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 20 }}>
              <button className="btn-small" onClick={() => setDecesPage((p) => Math.max(0, p - 1))} disabled={decesPage === 0 || decesLoading}>← Précédent</button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Page {decesPage + 1} / {decesTotal}</span>
              <button className="btn-small" onClick={() => setDecesPage((p) => Math.min(decesTotal - 1, p + 1))} disabled={decesPage >= decesTotal - 1 || decesLoading}>Suivant →</button>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
