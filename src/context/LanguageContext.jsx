import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'rsc_lang';
const DEFAULT_LANG = 'fr';
const canUseDOM = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const canUseDocument = typeof document !== 'undefined';

const getInitialLanguage = () => {
  if (!canUseDOM) {
    return DEFAULT_LANG;
  }

  return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
};

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLanguage);

  useEffect(() => {
    if (canUseDOM) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }, [lang]);

  useEffect(() => {
    if (!canUseDOM) {
      return undefined;
    }

    const syncFromStorage = () => {
      const storedLang = localStorage.getItem(STORAGE_KEY);
      if (storedLang && storedLang !== lang) {
        setLang(storedLang);
      }
    };

    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        syncFromStorage();
      }
    };

    syncFromStorage();
    window.addEventListener('storage', handleStorage);

    if (canUseDocument) {
      document.addEventListener('visibilitychange', syncFromStorage);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (canUseDocument) {
        document.removeEventListener('visibilitychange', syncFromStorage);
      }
    };
  }, [lang]);

  const contextValue = useMemo(() => ({
    lang,
    setLanguage: setLang,
  }), [lang]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
