import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import Layout from './components/Layout';

const loadAuthPage = () => import('./pages/AuthPage');
const loadShareholderWorkspace = () => import('./pages/shareholder/ShareholderWorkspace');
const loadAdminWorkspace = () => import('./pages/admin/AdminWorkspace');

const AuthPage = lazy(loadAuthPage);
const ShareholderWorkspace = lazy(loadShareholderWorkspace);
const AdminWorkspace = lazy(loadAdminWorkspace);

function PortalRouter() {
  const { user, loading } = useAuth();
  const isStaff = user && ['Administrator', 'Data officer', 'Approver'].includes(user.role);

  // Unauthenticated view: 'home' | 'auth'
  const [authView, setAuthView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#signin' || hash === '#login' || search.includes('login=true')) {
        return 'auth';
      }
    }
    return 'home';
  });
  const [authInitialMode, setAuthInitialMode] = useState('signin');

  const [workspaceMode, setWorkspaceMode] = useState(() =>
    isStaff ? 'admin' : 'shareholder'
  );
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUserId, setLastUserId] = useState(() => user?._id || null);
  const [badges, setBadges] = useState({
    unreadAnnouncements: 0,
    pendingApprovals: 0,
    openSupport: 0
  });
  const [shareholdersList, setShareholdersList] = useState([]);
  const [previewShareholderId, setPreviewShareholderId] = useState('');

  // Synchronously align workspaceMode & activeTab on login/logout before child workspaces mount.
  // Prevents mounting ShareholderWorkspace (and firing /api/portal/workspace) for 1 frame on staff login.
  if ((user?._id || null) !== lastUserId) {
    setLastUserId(user?._id || null);
    if (user) {
      const staffRole = ['Administrator', 'Data officer', 'Approver'].includes(user.role);
      setWorkspaceMode(staffRole ? 'admin' : 'shareholder');
      setActiveTab('overview');
    } else {
      setWorkspaceMode('shareholder');
      setActiveTab('overview');
      setBadges({ unreadAnnouncements: 0, pendingApprovals: 0, openSupport: 0 });
      setShareholdersList([]);
      setPreviewShareholderId('');
      setAuthView('home');
    }
  }

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#signin' || hash === '#login') {
        setAuthView('auth');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Preload AuthPage right after initial homepage paint so "Sign In to Portal" is 0ms instant,
    // and preload workspace chunks when browser is idle or when user enters Auth view.
    const authTimer = setTimeout(() => {
      loadAuthPage();
    }, 120);

    const preloadChunks = () => {
      loadShareholderWorkspace();
      loadAdminWorkspace();
    };
    if (authView === 'auth') {
      loadAuthPage();
      preloadChunks();
      return () => clearTimeout(authTimer);
    }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preloadChunks, { timeout: 2500 });
      return () => {
        clearTimeout(authTimer);
        window.cancelIdleCallback(idleId);
      };
    }
    const timer = setTimeout(preloadChunks, 1500);
    return () => {
      clearTimeout(authTimer);
      clearTimeout(timer);
    };
  }, [authView]);

  useEffect(() => {
    if (!user) {
      // Clear cached workspace data asynchronously upon logout
      loadAdminWorkspace().then((m) => m.clearAdminWorkspaceCache && m.clearAdminWorkspaceCache());
      loadShareholderWorkspace().then(
        (m) => m.clearShareholderWorkspaceCache && m.clearShareholderWorkspaceCache()
      );
    }
  }, [user]);

  const handleBadgesUpdate = useCallback((partial) => {
    setBadges((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleShareholdersLoaded = useCallback((list) => {
    setShareholdersList(list);
    setPreviewShareholderId((prev) => {
      if (prev) return prev;
      return list.length > 0 ? list[0].shareholderId : '';
    });
  }, []);

  const handleInspectShareholderPortal = useCallback((shId) => {
    setPreviewShareholderId(shId);
    setWorkspaceMode('shareholder');
    setActiveTab('holdings');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C16] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 rounded-full border-3 border-[#D4AF37] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wide text-[#F3E5AB]">
          Loading NIA Group Shareholder Portal...
        </p>
      </div>
    );
  }

  if (!user) {
    if (authView === 'auth') {
      return (
        <Suspense fallback={<div className="min-h-screen bg-[#080C16]" />}>
          <AuthPage
            initialMode={authInitialMode}
            onBackToHome={() => {
              setAuthView('home');
              if (typeof window !== 'undefined' && window.location.hash) {
                window.history.replaceState(null, '', window.location.pathname);
              }
            }}
          />
        </Suspense>
      );
    }
    return (
      <HomePage
        onNavigateToAuth={(targetMode = 'signin') => {
          setAuthInitialMode(targetMode);
          setAuthView('auth');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <Layout
      workspaceMode={isStaff ? workspaceMode : 'shareholder'}
      setWorkspaceMode={setWorkspaceMode}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      badges={badges}
      previewShareholderId={previewShareholderId}
      setPreviewShareholderId={setPreviewShareholderId}
      shareholdersList={shareholdersList}
    >
      <Suspense fallback={null}>
        {isStaff && workspaceMode === 'admin' ? (
          <AdminWorkspace
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onBadgesUpdate={handleBadgesUpdate}
            onShareholdersLoaded={handleShareholdersLoaded}
            onInspectShareholderPortal={handleInspectShareholderPortal}
          />
        ) : (
          <ShareholderWorkspace
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            previewShareholderId={isStaff ? previewShareholderId : user.shareholderId}
            onBadgesUpdate={handleBadgesUpdate}
          />
        )}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PortalRouter />
    </AuthProvider>
  );
}
