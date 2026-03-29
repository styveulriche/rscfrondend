import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  login as loginService,
  adminLogin as adminLoginService,
  register as registerService,
  logout as logoutService,
  validateToken as validateTokenService,
} from '../services/auth';
import { getProfile } from '../services/users';
import { getAdmin } from '../services/administrateurs';
import { myTotal } from '../services/paiements';
import { mesDonsTotal } from '../services/dons';
import { mesCotisationsTotal } from '../services/cotisations';

const AuthContext = createContext(null);

const ADMIN_ROLE_KEYS = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN_VALIDATEUR',
  'ADMIN_CONTENU',
  'ADMIN_SUPPORT',
  'ADMIN_FINANCIER',
  'MODERATEUR',
  'ADMIN',
  'ADMINISTRATEUR',
  'GESTIONNAIRE',
  'SUPPORT',
  'FINANCIER',
  'FINANCE',
  'ADMIN_FINANCE',
  'ADMIN_CONTENU',
]);

const normalizeRoleValue = (value) => {
  if (!value) return null;
  return String(value).trim().toUpperCase();
};

const extractRoles = (entity) => {
  if (!entity) return [];
  const collected = new Set();
  const pushValue = (val) => {
    const normalized = normalizeRoleValue(val);
    if (normalized) collected.add(normalized);
  };

  if (Array.isArray(entity.roles)) entity.roles.forEach(pushValue);
  if (entity.role) pushValue(entity.role);
  if (entity.type) pushValue(entity.type);
  if (entity.profil?.role) pushValue(entity.profil.role);
  if (entity.profil?.type) pushValue(entity.profil.type);
  if (entity.scope) pushValue(entity.scope);

  return Array.from(collected);
};

const withRoleMetadata = (entity) => {
  if (!entity) return entity;
  const roles = extractRoles(entity);
  const primaryRole = entity.role || roles[0] || null;
  return { ...entity, roles, primaryRole };
};

const hasRoleFromList = (roles, allowed = ADMIN_ROLE_KEYS) => {
  if (!roles || roles.length === 0) return false;
  const normalizedAllowed = allowed.map((role) => normalizeRoleValue(role)).filter(Boolean);
  return roles.some((role) => normalizedAllowed.includes(role));
};

// Décode le payload d'un JWT pour en extraire les rôles
const decodeJwtRoles = (token) => {
  if (!token || typeof token !== 'string') return [];
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return [];
    const payload = JSON.parse(atob(b64));
    const roles = [];
    if (payload.role) roles.push(payload.role);
    if (Array.isArray(payload.roles)) roles.push(...payload.roles);
    if (payload.authorities) {
      const auths = Array.isArray(payload.authorities) ? payload.authorities : [payload.authorities];
      auths.forEach((a) => roles.push(typeof a === 'string' ? a.replace(/^ROLE_/, '') : a));
    }
    if (payload.scope) roles.push(...String(payload.scope).split(' '));
    return roles.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
  } catch {
    return [];
  }
};


export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rsc_user');
    return saved ? withRoleMetadata(JSON.parse(saved)) : null;
  });

  const [balance, setBalance] = useState(0);

  const refreshBalance = useCallback(async (overrideUserId) => {
    const targetId = overrideUserId ?? user?.id;
    if (!targetId) {
      setBalance(0);
      return 0;
    }
    try {
      // Priorité 1 : profil utilisateur (champ solde direct)
      const profile = await getProfile(targetId);
      const profileBalance = profile?.solde ?? profile?.balance ?? profile?.montantDisponible ?? profile?.soldePortefeuille;
      if (typeof profileBalance === 'number' && Number.isFinite(profileBalance)) {
        setBalance(profileBalance);
        return profileBalance;
      }

      // Priorité 2 : total reçu − total dons − total cotisations payées
      const extractNum = (obj) => {
        if (!obj) return 0;
        if (typeof obj === 'number') return obj;
        const v = obj.totalDons ?? obj.totalCotisations ?? obj.total ?? obj.montant ?? obj.montantTotal
          ?? Object.values(obj).find((x) => typeof x === 'number');
        return Number.isFinite(Number(v)) ? Number(v) : 0;
      };

      const [receivedRes, donsRes, cotisationsRes] = await Promise.allSettled([
        myTotal(),
        mesDonsTotal(),
        mesCotisationsTotal(),
      ]);
      const received    = receivedRes.status    === 'fulfilled' ? extractNum(receivedRes.value)    : 0;
      const donated     = donsRes.status        === 'fulfilled' ? extractNum(donsRes.value)        : 0;
      const cotisations = cotisationsRes.status === 'fulfilled' ? extractNum(cotisationsRes.value) : 0;
      const computed = Math.max(0, received - donated - cotisations);
      setBalance(computed);
      return computed;
    } catch (err) {
      console.error('Erreur lors de la récupération du solde utilisateur', err);
      return 0;
    }
  }, [user?.id]);

  // Mise à jour optimiste : incrémente immédiatement le solde affiché
  // puis synchronise avec le serveur en arrière-plan
  const addToBalance = useCallback((amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0) return;
    setBalance((prev) => Math.max(0, prev + value));
  }, []);

  const persistTokens = ({ token, accessToken, refreshToken }) => {
    const t = token || accessToken;
    if (t) localStorage.setItem('rsc_token', t);
    if (refreshToken) localStorage.setItem('rsc_refresh_token', refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('rsc_token');
    localStorage.removeItem('rsc_refresh_token');
  };

  const persistUser = (profile) => {
    const enriched = withRoleMetadata(profile);
    localStorage.setItem('rsc_user', JSON.stringify(enriched));
    setUser(enriched);
  };

  const finalizeAuth = useCallback(async (payload, options = {}) => {
    if (!payload) {
      throw new Error('Réponse d\'authentification invalide.');
    }
    persistTokens(payload);

    let profile = null;
    if (payload?.id) {
      try {
        profile = await getProfile(payload.id);
      } catch {
        try {
          profile = await getAdmin(payload.id);
        } catch {
          profile = null;
        }
      }
    }

    // Extraire les rôles depuis 3 sources : JWT, payload réponse, profil backend
    const token = payload?.token || payload?.accessToken;
    const jwtRoles = decodeJwtRoles(token);
    const payloadRoles = extractRoles(payload);
    const profileRoles = extractRoles(profile ?? {});
    const mergedRoles = [...new Set([...jwtRoles, ...payloadRoles, ...profileRoles])];
    const baseData = profile ?? payload;
    const normalized = withRoleMetadata(
      mergedRoles.length > 0 ? { ...baseData, roles: mergedRoles } : baseData
    );
    const allowedRoles = options.allowedRoles?.length ? options.allowedRoles : ADMIN_ROLE_KEYS;
    if (options.requireAdmin && !hasRoleFromList(normalized.roles, allowedRoles)) {
      clearTokens();
      localStorage.removeItem('rsc_user');
      setUser(null);
      setBalance(0);
      throw new Error(options.adminErrorMessage || 'Accès administrateur refusé.');
    }

    persistUser(normalized);
    if (normalized?.id) await refreshBalance(normalized.id);
    return normalized;
  }, [refreshBalance]);

  const login = async (credentials, options = {}) => {
    // Tenter les deux endpoints en parallèle.
    // Le login admin a la priorité : il retourne un token avec tous les droits
    // (SUPER_ADMIN, ADMIN_FINANCIER, etc.). Pour les utilisateurs ordinaires,
    // l'endpoint admin retourne 401/403 et on utilise le login utilisateur.
    const [userResult, adminResult] = await Promise.allSettled([
      loginService(credentials),
      adminLoginService(credentials),
    ]);

    // Admin login réussi → priorité absolue
    if (adminResult.status === 'fulfilled' && (adminResult.value?.token || adminResult.value?.accessToken)) {
      return await finalizeAuth(adminResult.value, options);
    }

    // Seulement le login utilisateur a réussi
    if (userResult.status === 'fulfilled') {
      return await finalizeAuth(userResult.value, options);
    }

    // Les deux ont échoué → lever l'erreur utilisateur (plus explicite)
    throw userResult.reason;
  };

  const loginAdmin = async (credentials, options = {}) => {
    try {
      const data = await adminLoginService(credentials, { xForwardedFor: options.xForwardedFor });
      return await finalizeAuth(data, {
        ...options,
        requireAdmin: true,
        adminErrorMessage: 'Votre rôle ne permet pas d\'accéder à cet espace.',
      });
    } catch (err) {
      throw err;
    }
  };

  // Called after MFA verification succeeds — receives a full JwtResponse
  const completeLogin = useCallback((data, options = {}) => finalizeAuth(data, options), [finalizeAuth]);

  const register = async (payload) => {
    try {
      return await registerService(payload);
    } catch (err) {
      throw err;
    }
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // on mount, validate stored token and user
    const init = async () => {
      const token = localStorage.getItem('rsc_token');
      const saved = localStorage.getItem('rsc_user');
      if (!token || !saved) {
        setLoading(false);
        return;
      }
      try {
        await validateTokenService();
        const parsed = withRoleMetadata(JSON.parse(saved));
        // if parsed has id, refresh profile
        if (parsed?.id) {
          try {
            const profile = await getProfile(parsed.id);
            // Fusionner sans écraser les rôles admin stockés :
            // getProfile retourne un profil utilisateur sans rôles admin,
            // ce qui effacerait les droits SUPER_ADMIN sauvegardés.
            const savedRoles = extractRoles(parsed);
            const profileRoles = extractRoles(profile);
            const mergedRoles = [...new Set([...savedRoles, ...profileRoles])];
            const merged = withRoleMetadata({
              ...parsed,
              ...profile,
              ...(mergedRoles.length > 0 ? { roles: mergedRoles } : {}),
            });
            setUser(merged);
            localStorage.setItem('rsc_user', JSON.stringify(merged));
            await refreshBalance(merged.id);
          } catch (err) {
            setUser(parsed);
            await refreshBalance(parsed.id);
          }
        } else {
          setUser(parsed);
          await refreshBalance();
        }
      } catch (err) {
        clearTokens();
        localStorage.removeItem('rsc_user');
        setUser(null);
        setBalance(0);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshBalance]);

  const updateUser = (updates) => {
    const updated = withRoleMetadata({ ...user, ...updates });
    setUser(updated);
    localStorage.setItem('rsc_user', JSON.stringify(updated));
  };

  const logout = async () => {
    try {
      await logoutService();
    } catch (err) {
      // ignore logout failures and clear local state anyway
    } finally {
      setUser(null);
      localStorage.removeItem('rsc_user');
      clearTokens();
      setBalance(0);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    refreshBalance();
    const timer = setInterval(() => refreshBalance(), 20000);
    return () => clearInterval(timer);
  }, [refreshBalance, user?.id]);

  const userRoles = useMemo(() => (user?.roles ? user.roles : extractRoles(user)), [user]);
  const isAdmin = useMemo(() => hasRoleFromList(userRoles), [userRoles]);
  const isSuperAdmin = useMemo(() => hasRoleFromList(userRoles, ['SUPER_ADMIN']), [userRoles]);

  const hasRole = useCallback((rolesToCheck) => {
    if (!rolesToCheck || userRoles.length === 0) return false;
    const list = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
    return hasRoleFromList(userRoles, list);
  }, [userRoles]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginAdmin,
        completeLogin,
        register,
        logout,
        updateUser,
        balance,
        refreshBalance,
        addToBalance,
        loading,
        roles: userRoles,
        isAdmin,
        isSuperAdmin,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
