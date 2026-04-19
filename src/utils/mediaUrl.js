const MEDIA_ORIGIN = (() => {
  const explicit = process.env.REACT_APP_MEDIA_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const api = process.env.REACT_APP_API_BASE_URL?.trim()
    || `http://localhost:${process.env.REACT_APP_API_PORT || '8080'}/api/v1`;
  try { return new URL(api).origin; } catch { return ''; }
})();

export const buildMediaUrl = (path) => {
  if (!path) return null;
  if (/^(https?:\/\/|blob:|data:)/.test(path)) return path;
  return `${MEDIA_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};
