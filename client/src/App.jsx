import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import Layout from './components/Layout';

const ShareholderWorkspace = lazy(() => import('./pages/shareholder/ShareholderWorkspace'));
const AdminWorkspace = lazy(() => import('./pages/admin/AdminWorkspace'));

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

  const [workspaceMode, setWorkspaceMode] = useState('shareholder');
  const [activeTab, setActiveTab] = useState('overview');
  const [badges, setBadges] = useState({
    unreadAnnouncements: 0,
    pendingApprovals: 0,
    openSupport: 0
  });
  const [shareholdersList, setShareholdersList] = useState([]);
  const [previewShareholderId, setPreviewShareholderId] = useState('');

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
    if (user) {
      const staffRole = ['Administrator', 'Data officer', 'Approver'].includes(user.role);
      setWorkspaceMode(staffRole ? 'admin' : 'shareholder');
      setActiveTab('overview');
    } else {
      // Return to home upon logout
      setAuthView('home');
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
      <div className="min-h-screen bg-[#0D1127] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 rounded-full border-3 border-[#7C3AED] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wide text-slate-300">
          Loading NIA Group Shareholder Portal...
        </p>
      </div>
    );
  }

  if (!user) {
    if (authView === 'auth') {
      return (
        <AuthPage
          initialMode={authInitialMode}
          onBackToHome={() => {
            setAuthView('home');
            if (typeof window !== 'undefined' && window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
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
      <Suspense
        fallback={
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <div className="w-9 h-9 rounded-full border-3 border-[#7C3AED] border-t-transparent animate-spin mb-2" />
            <p className="text-xs font-medium">Loading workspace...</p>
          </div>
        }
      >
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
