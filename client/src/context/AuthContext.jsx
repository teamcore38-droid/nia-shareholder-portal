import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState({
    companyDisplayName: 'NIA Group of Company',
    legalName: 'NIA Group of Company Ltd',
    baseCurrency: 'LKR',
    shareClass: 'Ordinary',
    businessTimezone: 'Asia/Colombo'
  });
  const [permissions, setPermissions] = useState(null);
  const [shareholderProfile, setShareholderProfile] = useState(null);
  const [bootstrapStatus, setBootstrapStatus] = useState({ initialized: true, userCount: 1 });
  const [loading, setLoading] = useState(true);
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
      const bootRes = await api.get('/auth/bootstrap-status');
      setBootstrapStatus(bootRes.data);
      if (bootRes.data.company) {
        setCompany((prev) => ({ ...prev, ...bootRes.data.company }));
      }

      const token = localStorage.getItem('apex_portal_token');
      if (token) {
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.user);
        setPermissions(meRes.data.permissions);
        setShareholderProfile(meRes.data.shareholderProfile || null);
        if (meRes.data.company) setCompany(meRes.data.company);
      }
    } catch (err) {
      localStorage.removeItem('apex_portal_token');
      setUser(null);
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
    if (data.company) setCompany(data.company);
    setBootstrapStatus((prev) => ({ ...prev, initialized: true }));
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('apex_portal_token');
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
