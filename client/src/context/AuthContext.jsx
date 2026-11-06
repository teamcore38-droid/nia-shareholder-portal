import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const AuthContext = createContext(null);

const SESSION_CACHE_KEY = 'apex_portal_cached_session';
const COMPANY_CACHE_KEY = 'apex_portal_cached_company';

function readCachedJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const initialToken =
    typeof window !== 'undefined' ? localStorage.getItem('apex_portal_token') : null;
  const cachedSession = initialToken ? readCachedJson(SESSION_CACHE_KEY) : null;
  const cachedCompany = readCachedJson(COMPANY_CACHE_KEY);

  const [user, setUser] = useState(() => cachedSession?.user || null);
  const [company, setCompany] = useState(() => ({
    companyDisplayName: 'NIA Group of Company',
    legalName: 'NIA Group of Company Ltd',
    baseCurrency: 'LKR',
    shareClass: 'Ordinary',
    businessTimezone: 'Asia/Colombo',
    ...(cachedCompany || {}),
    ...(cachedSession?.company || {})
  }));
  const [permissions, setPermissions] = useState(() => cachedSession?.permissions || null);
  const [shareholderProfile, setShareholderProfile] = useState(
    () => cachedSession?.shareholderProfile || null
  );
  const [bootstrapStatus, setBootstrapStatus] = useState({ initialized: true, userCount: 1 });
  // Only block initial render if a token exists in localStorage but we have no cached user session yet.
  // Unauthenticated visitors entering Home Page or returning users with cached session render in 0ms!
  const [loading, setLoading] = useState(() => Boolean(initialToken && !cachedSession?.user));
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchBootstrapAndSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('apex_portal_token');
      const [bootRes, meRes] = await Promise.all([
        api.get('/auth/bootstrap-status').catch(() => null),
        token ? api.get('/auth/me') : Promise.resolve(null)
      ]);

      if (bootRes?.data) {
        setBootstrapStatus(bootRes.data);
        if (bootRes.data.company) {
          setCompany((prev) => {
            const merged = { ...prev, ...bootRes.data.company };
            try {
              localStorage.setItem(COMPANY_CACHE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }

      if (token && meRes?.data) {
        setUser(meRes.data.user);
        setPermissions(meRes.data.permissions);
        setShareholderProfile(meRes.data.shareholderProfile || null);
        if (meRes.data.company) {
          setCompany(meRes.data.company);
          try {
            localStorage.setItem(COMPANY_CACHE_KEY, JSON.stringify(meRes.data.company));
          } catch {}
        }
        try {
          localStorage.setItem(
            SESSION_CACHE_KEY,
            JSON.stringify({
              user: meRes.data.user,
              permissions: meRes.data.permissions || null,
              shareholderProfile: meRes.data.shareholderProfile || null,
              company: meRes.data.company || null
            })
          );
        } catch {}
      }
    } catch (err) {
      localStorage.removeItem('apex_portal_token');
      localStorage.removeItem(SESSION_CACHE_KEY);
      setUser(null);
      setPermissions(null);
      setShareholderProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrapAndSession();
  }, [fetchBootstrapAndSession]);

  const applySession = (data) => {
    if (data.token) {
      localStorage.setItem('apex_portal_token', data.token);
    }
    if (data.user) setUser(data.user);
    if (data.permissions) setPermissions(data.permissions);
    if (data.company) {
      setCompany(data.company);
      try {
        localStorage.setItem(COMPANY_CACHE_KEY, JSON.stringify(data.company));
      } catch {}
    }
    if (data.user) {
      try {
        localStorage.setItem(
          SESSION_CACHE_KEY,
          JSON.stringify({
            user: data.user,
            permissions: data.permissions || permissions || null,
            shareholderProfile: data.shareholderProfile || shareholderProfile || null,
            company: data.company || company || null
          })
        );
      } catch {}
    }
    setBootstrapStatus((prev) => ({ ...prev, initialized: true }));
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('apex_portal_token');
    localStorage.removeItem(SESSION_CACHE_KEY);
    setUser(null);
    setPermissions(null);
    setShareholderProfile(null);
    notify('Signed out of your portal session.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        company,
        setCompany,
        permissions,
        shareholderProfile,
        bootstrapStatus,
        loading,
        applySession,
        refreshSession: fetchBootstrapAndSession,
        logout,
        notify
      }}
    >
      {children}

      {/* Floating Executive Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
              t.type === 'error'
                ? 'bg-red-950/95 border-red-700/80 text-red-50'
                : t.type === 'info'
                ? 'bg-slate-900/95 border-slate-700 text-slate-100'
                : 'bg-[#0A1128]/95 border-amber-500/50 text-white'
            }`}
          >
            {t.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : t.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm font-medium leading-snug">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
