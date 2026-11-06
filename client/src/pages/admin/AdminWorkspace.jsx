import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AdminCoreTabs from './AdminCoreTabs';
import AdminGovernanceTabs from './AdminGovernanceTabs';

// In-memory cache so switching between Admin Workspace and Shareholder Portal renders in 0ms
let cachedAdminWorkspace = null;

export function clearAdminWorkspaceCache() {
  cachedAdminWorkspace = null;
}

export default function AdminWorkspace({
  activeTab,
  setActiveTab,
  onBadgesUpdate,
  onShareholdersLoaded,
  onInspectShareholderPortal
}) {
  const { notify } = useAuth();

  const [overviewData, setOverviewData] = useState(() => cachedAdminWorkspace?.overview || null);
  const [shareholdersData, setShareholdersData] = useState(
    () => cachedAdminWorkspace?.shareholders || null
  );
  const [movementsData, setMovementsData] = useState(
    () => cachedAdminWorkspace?.movements || null
  );
  const [valuationsData, setValuationsData] = useState(
    () => cachedAdminWorkspace?.valuations || null
  );
  const [approvalsData, setApprovalsData] = useState(
    () => cachedAdminWorkspace?.approvals || null
  );
  const [publicationsData, setPublicationsData] = useState(
    () => cachedAdminWorkspace?.publications || null
  );
  const [staffData, setStaffData] = useState(() => cachedAdminWorkspace?.staff || null);
  const [supportData, setSupportData] = useState(
    () => cachedAdminWorkspace?.supportRequests || null
  );
  const [auditLogsData, setAuditLogsData] = useState(
    () => cachedAdminWorkspace?.auditLogs || null
  );
  const [settingsData, setSettingsData] = useState(
    () => cachedAdminWorkspace?.settings || null
  );
  const [loading, setLoading] = useState(() => !cachedAdminWorkspace);

  const loadAdminData = useCallback(async () => {
    try {
      const res = await api.get('/admin/workspace');
      const data = res.data;
      cachedAdminWorkspace = data;

      setOverviewData(data.overview);
      setShareholdersData(data.shareholders);
      setMovementsData(data.movements);
      setValuationsData(data.valuations);
      setApprovalsData(data.approvals);
      setPublicationsData(data.publications);
      setStaffData(data.staff);
      setSupportData(data.supportRequests);
      setAuditLogsData(data.auditLogs);
      setSettingsData(data.settings);

      if (onShareholdersLoaded) {
        onShareholdersLoaded(data.shareholders?.shareholders || []);
      }

      if (onBadgesUpdate) {
        onBadgesUpdate({
          pendingApprovals: data.overview?.summary?.pendingReviewsCount || 0,
          openSupport: data.overview?.summary?.openSupportCount || 0
        });
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to load administration data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, onBadgesUpdate, onShareholdersLoaded]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (loading && !overviewData) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 rounded-full border-3 border-[#D4AF37] border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-medium">Loading administration workspace...</p>
      </div>
    );
  }

  const coreTabs = ['overview', 'shareholders', 'register', 'values', 'approvals'];
  if (coreTabs.includes(activeTab)) {
    return (
      <AdminCoreTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overviewData={overviewData}
        shareholdersData={shareholdersData}
        movementsData={movementsData}
        valuationsData={valuationsData}
        approvalsData={approvalsData}
        onRefresh={loadAdminData}
        onInspectShareholderPortal={onInspectShareholderPortal}
      />
    );
  }

  return (
    <AdminGovernanceTabs
      activeTab={activeTab}
      publicationsData={publicationsData}
      staffData={staffData}
      supportData={supportData}
      auditLogsData={auditLogsData}
      settingsData={settingsData}
      shareholdersList={shareholdersData?.shareholders || []}
      onRefresh={loadAdminData}
    />
  );
}
