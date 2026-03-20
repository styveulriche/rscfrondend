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
import { paymentsStats } from '../services/paiements';

const AuthContext = createContext(null);

const ADMIN_ROLE_KEYS = Object.freeze([
  'SUPER_ADMIN',
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
      const stats = await paymentsStats({ utilisateurId: targetId });
      const raw = stats?.soldeActuel ?? stats?.currentBalance ?? stats?.balance ?? stats?.solde ?? stats?.montantDisponible;
      const value = Number(raw);
      const normalized = Number.isFinite(value) ? value : 0;
      setBalance(normalized);
      return normalized;
    } catch (err) {
      console.error('Erreur lors de la récupération du solde utilisateur', err);
      return 0;
    }
  }, [user?.id]);

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

  const login = async (credentials, options = {}) => {
    try {
      // Essai connexion utilisateur, puis admin si non trouvé
      let data;
      try {
        data = await loginService(credentials);
      } catch (err) {
        const msg = err?.response?.data?.message || '';
        if (err?.response?.status === 404 || msg.toLowerCase().includes('non trouvé') || msg.toLowerCase().includes('not found')) {
          data = await adminLoginService(credentials);
        } else {
          throw err;
        }
      }

      persistTokens(data);

      if (data?.id) {
        // Récupérer le profil : d'abord utilisateur, sinon administrateur
        let profile = null;
        try {
          profile = await getProfile(data.id);
        } catch {
          try {
            profile = await getAdmin(data.id);
          } catch {
            profile = null;
          }
        }

        const source = profile ?? data;
        const normalized = withRoleMetadata(source);
        const allowedRoles = options.allowedRoles?.length ? options.allowedRoles : ADMIN_ROLE_KEYS;
        if (options.requireAdmin && !hasRoleFromList(normalized.roles, allowedRoles)) {
          clearTokens();
          localStorage.removeItem('rsc_user');
          setUser(null);
          setBalance(0);
          throw new Error('Accès administrateur refusé.');
        }
        persistUser(normalized);
        await refreshBalance(normalized.id);
        return normalized;
      }

      const normalized = withRoleMetadata(data);
      if (options.requireAdmin && !hasRoleFromList(normalized.roles)) {
        clearTokens();
        localStorage.removeItem('rsc_user');
        setUser(null);
        setBalance(0);
        throw new Error('Accès administrateur refusé.');
      }
      persistUser(normalized);
      if (normalized?.id) await refreshBalance(normalized.id);
      return normalized;
    } catch (err) {
      throw err;
    }
  };

  // Called after MFA verification succeeds — receives a full JwtResponse
  const completeLogin = useCallback(async (data) => {
    persistTokens(data);
    if (data?.id) {
      let profile = null;
      try {
        profile = await getProfile(data.id);
      } catch {
        try {
          profile = await getAdmin(data.id);
        } catch {
          profile = null;
        }
      }
      const normalized = withRoleMetadata(profile ?? data);
      persistUser(normalized);
      await refreshBalance(normalized.id);
      return normalized;
    }
    const normalized = withRoleMetadata(data);
    persistUser(normalized);
    if (normalized?.id) await refreshBalance(normalized.id);
    return normalized;
  }, [refreshBalance]);

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
            setUser(profile);
            localStorage.setItem('rsc_user', JSON.stringify(profile));
            await refreshBalance(profile.id);
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
    refreshBalance();
  }, [refreshBalance]);

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
        completeLogin,
        register,
        logout,
        updateUser,
        balance,
        refreshBalance,
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
