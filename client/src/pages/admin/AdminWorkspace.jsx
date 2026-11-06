import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AdminCoreTabs from './AdminCoreTabs';
import AdminGovernanceTabs from './AdminGovernanceTabs';

export default function AdminWorkspace({
  activeTab,
  setActiveTab,
  onBadgesUpdate,
  onShareholdersLoaded,
  onInspectShareholderPortal
}) {
  const { notify } = useAuth();

  const [overviewData, setOverviewData] = useState(null);
  const [shareholdersData, setShareholdersData] = useState(null);
  const [movementsData, setMovementsData] = useState(null);
  const [valuationsData, setValuationsData] = useState(null);
  const [approvalsData, setApprovalsData] = useState(null);
  const [publicationsData, setPublicationsData] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [supportData, setSupportData] = useState(null);
  const [auditLogsData, setAuditLogsData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    try {
      const [
        ovRes,
        shRes,
        movRes,
        valRes,
        appRes,
        pubRes,
        stRes,
        supRes,
        audRes,
        setRes
      ] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/shareholders'),
        api.get('/admin/movements'),
        api.get('/admin/valuations'),
        api.get('/admin/approvals'),
        api.get('/admin/publications'),
        api.get('/admin/staff'),
        api.get('/admin/support-requests'),
        api.get('/admin/audit-logs'),
        api.get('/admin/settings')
      ]);

      setOverviewData(ovRes.data);
      setShareholdersData(shRes.data);
      setMovementsData(movRes.data);
      setValuationsData(valRes.data);
      setApprovalsData(appRes.data);
      setPublicationsData(pubRes.data);
      setStaffData(stRes.data);
      setSupportData(supRes.data);
      setAuditLogsData(audRes.data);
      setSettingsData(setRes.data);

      if (onShareholdersLoaded) {
        onShareholdersLoaded(shRes.data.shareholders || []);
      }

      if (onBadgesUpdate) {
        onBadgesUpdate({
          pendingApprovals: ovRes.data.summary?.pendingReviewsCount || 0,
          openSupport: ovRes.data.summary?.openSupportCount || 0
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
