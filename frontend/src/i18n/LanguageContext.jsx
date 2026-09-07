import React, { createContext, useContext, useMemo, useState } from 'react';
import { en } from './en';
import { hi } from './hi';

const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('ks_language') || 'hi');
  const changeLanguage = (next) => { setLanguage(next); localStorage.setItem('ks_language', next); };
  const t = (key) => (language === 'hi' ? hi[key] : en[key]) || key;
  const value = useMemo(() => ({ language, setLanguage: changeLanguage, t }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }
