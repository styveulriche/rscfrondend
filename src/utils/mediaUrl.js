const MEDIA_ORIGIN = (() => {
  const explicit = process.env.REACT_APP_MEDIA_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const api = process.env.REACT_APP_API_BASE_URL?.trim()
    || `http://localhost:${process.env.REACT_APP_API_PORT || '8080'}/api/v1`;
  try { return new URL(api).origin; } catch { return ''; }
})();

export const buildMediaUrl = (path) => {
  if (!path) return null;
  if (/^(blob:|data:)/.test(path)) return path;
  if (/^https?:\/\//.test(path)) {
    try {
      const url = new URL(path);
      // Rewrite localhost URLs (backend returning internal hostnames)
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${MEDIA_ORIGIN}${url.pathname}${url.search}`;
      }
    } catch (_) { /* ignore */ }
    return path;
  }
  return `${MEDIA_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};
