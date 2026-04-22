import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaSearch, FaSpinner } from 'react-icons/fa';

const PROVINCE_CODES = {
  AB: 'Alberta',
  BC: 'Colombie-Britannique',
  MB: 'Manitoba',
  NB: 'Nouveau-Brunswick',
  NL: 'Terre-Neuve-et-Labrador',
  NS: 'Nouvelle-Écosse',
  ON: 'Ontario',
  PE: 'Île-du-Prince-Édouard',
  QC: 'Québec',
  SK: 'Saskatchewan',
  NT: 'Territoires du Nord-Ouest',
  NU: 'Nunavut',
  YT: 'Yukon',
};

const CANADA_POST_KEY = process.env.REACT_APP_CANADA_POST_KEY;

async function searchCanadaPost(term, lastId = null) {
  const url = new URL('https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws');
  url.searchParams.set('Key', CANADA_POST_KEY);
  url.searchParams.set('SearchTerm', term);
  url.searchParams.set('Country', 'CAN');
  url.searchParams.set('LanguagePreference', 'FR');
  if (lastId) url.searchParams.set('LastId', lastId);
  const r = await fetch(url.toString());
  const json = await r.json();
  return (json.Items || []).filter((i) => i.Error === undefined);
}

async function retrieveCanadaPost(id) {
  const url = new URL('https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/v2.11/json3.ws');
  url.searchParams.set('Key', CANADA_POST_KEY);
  url.searchParams.set('Id', id);
  const r = await fetch(url.toString());
  const json = await r.json();
  return (json.Items || [])[0] || null;
}

async function searchGeocoder(term) {
  const url = new URL('https://geocoder.alpha.canada.ca/api/address');
  url.searchParams.set('q', term);
  url.searchParams.set('limit', '6');
  url.searchParams.set('lang', 'fr');
  const r = await fetch(url.toString());
  const json = await r.json();
  return (json.features || []).map((f) => {
    const p = f.properties || {};
    return {
      id: f.id || `${p.lon},${p.lat}`,
      Text: [p.number, p.street].filter(Boolean).join(' ') || p.fullAddress || '',
      Description: [p.city, p.province].filter(Boolean).join(', '),
      _raw: p,
      _type: 'geocoder',
    };
  });
}

function extractFromGeocoder(raw) {
  const code = (raw.province_code || raw.stateCode || '').toUpperCase();
  return {
    adresseComplete: raw.fullAddress || [raw.number, raw.street, raw.city, code, raw.postal].filter(Boolean).join(', '),
    ville: raw.city || '',
    province: PROVINCE_CODES[code] || raw.province || '',
    codePostal: raw.postal ? raw.postal.replace(/([A-Z0-9]{3})([A-Z0-9]{3})/i, '$1 $2').toUpperCase() : '',
  };
}

function extractFromCanadaPost(item) {
  const code = (item.ProvinceCode || item.Province || '').toUpperCase();
  const street = [item.SubBuilding, item.BuildingNumber, item.Street].filter(Boolean).join(' ');
  const city = item.City || '';
  const postal = item.PostalCode || '';
  const full = [street, city, code, postal].filter(Boolean).join(', ');
  return {
    adresseComplete: full,
    ville: city,
    province: PROVINCE_CODES[code] || item.Province || '',
    codePostal: postal,
  };
}

/**
 * AddressAutocomplete — address search input with dropdown suggestions.
 * onSelect(fields) receives { adresseComplete, ville, province, codePostal }.
 */
export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, required }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const search = useCallback(async (term) => {
    if (!term || term.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      let items;
      if (CANADA_POST_KEY) {
        items = await searchCanadaPost(term);
      } else {
        items = await searchGeocoder(term);
      }
      setSuggestions(items.slice(0, 6));
      setOpen(items.length > 0);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 320);
  };

  const handleSelect = async (item) => {
    setOpen(false);
    setSuggestions([]);
    if (CANADA_POST_KEY) {
      if (item.Next === 'Find') {
        // container item — drill down
        const sub = await searchCanadaPost(value, item.Id);
        setSuggestions(sub.slice(0, 6));
        setOpen(sub.length > 0);
        return;
      }
      setLoading(true);
      try {
        const detail = await retrieveCanadaPost(item.Id);
        if (detail) {
          const fields = extractFromCanadaPost(detail);
          onChange(fields.adresseComplete);
          onSelect(fields);
        }
      } finally {
        setLoading(false);
      }
    } else {
      onSelect(extractFromGeocoder(item._raw));
      onChange(item.Text);
    }
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <FaSearch size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-card)', pointerEvents: 'none' }} />
        {loading && (
          <FaSpinner size={12} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-gray)', animation: 'spin 1s linear infinite' }} />
        )}
        <input
          className="form-input"
          style={{ paddingLeft: 32, paddingRight: loading ? 32 : undefined }}
          placeholder={placeholder || 'Rechercher une adresse canadienne…'}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          required={required}
          autoComplete="off"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 1000,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {suggestions.map((item, idx) => (
            <li
              key={item.Id || item.id || idx}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                background: idx === activeIdx ? 'rgba(198,40,40,0.06)' : 'transparent',
                borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <FaMapMarkerAlt size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--red-primary)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.Text}</div>
                {item.Description && <div style={{ fontSize: 12, color: 'var(--text-gray)' }}>{item.Description}</div>}
              </div>
            </li>
          ))}
          {!CANADA_POST_KEY && (
            <li style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text-gray)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              Propulsé par le Géocodeur du gouvernement du Canada
            </li>
          )}
        </ul>
      )}

      <style>{`@keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}
