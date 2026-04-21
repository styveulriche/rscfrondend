const MEDIA_ORIGIN = (() => {
  const explicit = process.env.REACT_APP_MEDIA_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const api = process.env.REACT_APP_API_BASE_URL?.trim()
    || `http://localhost:${process.env.REACT_APP_API_PORT || '8080'}/api/v1`;
  try { return new URL(api).origin; } catch { return ''; }
})();

export const buildMediaUrl = (path) => {
  if (!path) return null;
  const p = typeof path === 'string' ? path.trim() : path;
  if (!p) return null;
  if (/^(blob:|data:)/.test(p)) return p;
  if (/^https?:\/\//.test(p)) {
    try {
      const url = new URL(p);
      // In production (Docker), MEDIA_ORIGIN is '' — route via nginx proxy using pathname only
      if (MEDIA_ORIGIN === '' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${MEDIA_ORIGIN}${url.pathname}${url.search}`;
      }
    } catch (_) { /* ignore */ }
    return p;
  }
  return `${MEDIA_ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`;
};
