import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CentralPortal from './components/CentralPortal';
import AdminView from './components/AdminView';
import ManagerView from './components/ManagerView';
import AuditorView from './components/AuditorView';
import UserView from './components/UserView';
import ProvenanceModal from './components/ProvenanceModal';
import CommunicationChannel from './components/CommunicationChannel';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import { checkHealth, getNFTHistory, getAllDIDs, getAllNFTs, getAuditLogs, getMessages } from './services/api';
import './App.css';

function App() {
  // Navigation View State: 'PORTAL' (Central Landing) or 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'USER'
  const [currentView, setCurrentView] = useState('PORTAL');
  const [activeRole, setActiveRole] = useState('ADMIN');
  const [activeDID, setActiveDID] = useState('did:sih26125:ADMIN001');

  // Authenticated User Session
  const [authUser, setAuthUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingRoleTarget, setPendingRoleTarget] = useState(null);

  // Communication Channel Drawer State
  const [showCommChannel, setShowCommChannel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [systemStatus, setSystemStatus] = useState({ isOnline: true, latency: 14 });
  const [toast, setToast] = useState(null);

  // Live Metrics Stats for Central Portal
  const [metrics, setMetrics] = useState({
    didsCount: 0,
    nftsCount: 0,
    auditsCount: 0,
  });

  // Provenance Modal State
  const [selectedTokenHistory, setSelectedTokenHistory] = useState(null);

  const fetchMetrics = async () => {
    try {
      const [didsRes, nftsRes, auditRes] = await Promise.allSettled([
        getAllDIDs(),
        getAllNFTs(),
        getAuditLogs(),
      ]);

      const dids = didsRes.status === 'fulfilled' ? (didsRes.value?.data || didsRes.value || []) : [];
      const nfts = nftsRes.status === 'fulfilled' ? (nftsRes.value?.data || nftsRes.value || []) : [];
      const audits = auditRes.status === 'fulfilled' ? (auditRes.value?.data || auditRes.value || []) : [];

      setMetrics({
        didsCount: Array.isArray(dids) ? dids.length : 0,
        nftsCount: Array.isArray(nfts) ? nfts.length : 0,
        auditsCount: Array.isArray(audits) ? audits.length : 0,
      });
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await getMessages(activeRole, activeDID);
      const data = res?.data || res || [];
      if (Array.isArray(data)) {
        const pending = data.filter(t => t.status === 'PENDING' || t.status === 'ASSIGNED_TO_MANAGER');
        setUnreadCount(pending.length);
      }
    } catch {
      // Ignore background count error
    }
  };

  const handleSelectRoleFromPortal = (role) => {
    setPendingRoleTarget(role);
    if (!authUser || authUser.role !== role) {
      setShowAuthModal(true);
    } else {
      setActiveRole(role);
      setActiveDID(authUser.did);
      setCurrentView(role);
    }
  };

  const handleLoginSuccess = (userSession) => {
    setAuthUser(userSession);
    setActiveDID(userSession.did);
    setActiveRole(userSession.role);
    setShowAuthModal(false);
    setCurrentView(userSession.role);
    showToast(`Welcome ${userSession.username}! Logged into ${userSession.role} portal.`, 'success');
  };

  const handleLogout = () => {
    setAuthUser(null);
    setActiveDID('');
    setActiveRole('USER');
    setCurrentView('PORTAL');
    showToast('Logged out successfully', 'info');
  };

  const handleReturnHome = () => {
    setCurrentView('PORTAL');
    fetchMetrics();
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const checkStatus = async () => {
    const health = await checkHealth();
    setSystemStatus({ isOnline: health.isOnline, latency: health.latency });
  };

  useEffect(() => {
    checkStatus();
    fetchMetrics();
    fetchUnreadCount();
    const interval = setInterval(() => {
      checkStatus();
      fetchUnreadCount();
    }, 12000);
    return () => clearInterval(interval);
  }, [activeRole, activeDID]);

  const handleMetricsUpdate = (newMetrics) => {
    setMetrics((prev) => ({ ...prev, ...newMetrics }));
  };

  const handleOpenProvenance = async (tokenId) => {
    try {
      const historyData = await getNFTHistory(tokenId);
      setSelectedTokenHistory({ tokenId, historyData });
    } catch (err) {
      showToast(`Failed to fetch history for ${tokenId}: ${err.message}`, 'error');
    }
  };

  return (
    <div className="app-container">
      {/* Toast Alert Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header Bar (Shown only inside dedicated role portals) */}
      {currentView !== 'PORTAL' && (
        <Header
          systemStatus={systemStatus}
          activeRole={activeRole}
          currentView={currentView}
          onReturnHome={handleReturnHome}
          onOpenCommChannel={() => setShowCommChannel(true)}
          authUser={authUser}
          onLogout={handleLogout}
          unreadCount={unreadCount}
        />
      )}

      {/* Main Viewport */}
      <main className="main-viewport">
        {/* VIEW 1: Central Portal Landing Page */}
        {currentView === 'PORTAL' && (
          <CentralPortal
            metrics={metrics}
            systemStatus={systemStatus}
            onSelectRole={handleSelectRoleFromPortal}
          />
        )}

        {/* VIEW 2: Dedicated Admin Page */}
        {currentView === 'ADMIN' && (
          <AdminView
            activeDID={activeDID}
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
            onMetricsUpdate={handleMetricsUpdate}
          />
        )}

        {/* VIEW 3: Dedicated Manager Page */}
        {currentView === 'MANAGER' && (
          <ManagerView
            activeDID={activeDID}
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
          />
        )}

        {/* VIEW 4: Dedicated Auditor Page */}
        {currentView === 'AUDITOR' && (
          <AuditorView
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
          />
        )}

        {/* VIEW 5: Dedicated User Page */}
        {currentView === 'USER' && (
          <UserView
            activeDID={activeDID}
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
          />
        )}
      </main>

      {/* Communication & Task Dispatch Channel Drawer / Modal */}
      {showCommChannel && (
        <CommunicationChannel
          activeRole={activeRole}
          activeDID={activeDID}
          notify={showToast}
          onClose={() => setShowCommChannel(false)}
        />
      )}

      {/* Auth Modal for Role Login / Sign-up */}
      {showAuthModal && (
        <AuthModal
          role={pendingRoleTarget || 'USER'}
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Provenance History Timeline Modal */}
      {selectedTokenHistory && (
        <ProvenanceModal
          tokenId={selectedTokenHistory.tokenId}
          historyData={selectedTokenHistory.historyData}
          onClose={() => setSelectedTokenHistory(null)}
        />
      )}
    </div>
  );
}

export default App;

