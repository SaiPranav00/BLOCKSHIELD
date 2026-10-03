import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CentralPortal from './components/CentralPortal';
import AdminLanding from './components/AdminLanding';
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
  // Auto-detect port assignment for dedicated role hosting:
  // Port 5174 -> Admin Landing Page, Port 5175 -> Manager, Port 5176 -> Auditor, Port 5173 -> General/Portal
  const initialPort = typeof window !== 'undefined' ? (window.location.port || '5173') : '5173';
  const initialView = initialPort === '5174' ? 'ADMIN_LANDING'
    : initialPort === '5175' ? 'MANAGER'
    : initialPort === '5176' ? 'AUDITOR'
    : 'PORTAL';
  const initialRole = initialPort === '5174' ? 'ADMIN'
    : initialPort === '5175' ? 'MANAGER'
    : initialPort === '5176' ? 'AUDITOR'
    : 'USER';
  const initialDID = initialPort === '5174' ? 'did:sih26125:ADMIN001'
    : initialPort === '5175' ? 'did:sih26125:MANAGER001'
    : initialPort === '5176' ? 'did:sih26125:AUDITOR001'
    : 'did:sih26125:USER001';

  // Navigation View State: 'PORTAL' (Central Landing), 'ADMIN_LANDING' (Admin Landing) or 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'USER'
  const [currentView, setCurrentView] = useState(initialView);
  const [activeRole, setActiveRole] = useState(initialRole);
  const [activeDID, setActiveDID] = useState(initialDID);

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
    setActiveDID(initialPort === '5174' ? 'did:sih26125:ADMIN001' : 'did:sih26125:USER001');
    setActiveRole(initialPort === '5174' ? 'ADMIN' : 'USER');
    setCurrentView(initialPort === '5174' ? 'ADMIN_LANDING' : 'PORTAL');
    showToast('Logged out successfully', 'info');
  };

  const handleReturnHome = () => {
    if (initialPort === '5174') {
      setCurrentView('ADMIN_LANDING');
    } else {
      setCurrentView('PORTAL');
    }
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
    <div className={`app-container ${currentView === 'PORTAL' ? 'portal-app-wrapper' : ''}`}>
      {/* Toast Alert Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Global Header Bar (Shown when inside a workspace or dedicated page) */}
      {currentView !== 'PORTAL' && (
        <Header
          systemStatus={systemStatus}
          activeRole={activeRole}
          currentView={currentView}
          onReturnHome={handleReturnHome}
          onSelectRole={handleSelectRoleFromPortal}
          onOpenCommChannel={() => setShowCommChannel(true)}
          authUser={authUser}
          onLogout={handleLogout}
          unreadCount={unreadCount}
        />
      )}

      {/* Main Viewport */}
      <main className="main-viewport">
        {/* VIEW 1: Central Portal Landing Page (Port 5173 default) */}
        {currentView === 'PORTAL' && (
          <CentralPortal
            metrics={metrics}
            systemStatus={systemStatus}
            onSelectRole={handleSelectRoleFromPortal}
            authUser={authUser}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 1B: Dedicated Admin Landing Page (Port 5174 default) */}
        {currentView === 'ADMIN_LANDING' && (
          <AdminLanding
            metrics={metrics}
            systemStatus={systemStatus}
            authUser={authUser}
            onEnterDashboard={() => setCurrentView('ADMIN')}
            onLoginSuccess={handleLoginSuccess}
            onOpenAuth={() => {
              setPendingRoleTarget('ADMIN');
              setShowAuthModal(true);
            }}
          />
        )}

        {/* VIEW 2: Dedicated Admin Portal Page */}
        {currentView === 'ADMIN' && (
          <AdminView
            activeDID={activeDID}
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
            onMetricsUpdate={handleMetricsUpdate}
            onLogout={handleLogout}
            authUser={authUser}
          />
        )}

        {/* VIEW 3: Dedicated Manager Portal Page */}
        {currentView === 'MANAGER' && (
          <ManagerView
            activeDID={activeDID}
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
            onLogout={handleLogout}
            authUser={authUser}
          />
        )}

        {/* VIEW 4: Dedicated Auditor Portal Page */}
        {currentView === 'AUDITOR' && (
          <AuditorView
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
            onLogout={handleLogout}
            authUser={authUser}
          />
        )}

        {/* VIEW 5: Dedicated User Portal Page */}
        {currentView === 'USER' && (
          <UserView
            activeDID={activeDID}
            notify={showToast}
            onViewProvenance={handleOpenProvenance}
            onLogout={handleLogout}
            authUser={authUser}
          />
        )}
      </main>

      {/* Communication & Task Dispatch Channel Modal */}
      {showCommChannel && (
        <CommunicationChannel
          activeRole={activeRole}
          activeDID={activeDID}
          notify={showToast}
          onClose={() => setShowCommChannel(false)}
          onLedgerUpdate={fetchMetrics}
        />
      )}

      {/* Floating Chat Trigger Button - Accessible across all 4 roles */}
      {!showCommChannel && (
        <button
          className="floating-chat-fab"
          onClick={() => setShowCommChannel(true)}
          title={`Open Full Page Zoom Chat (${activeRole})`}
        >
          <span className="fab-icon">💬</span>
          <span className="fab-label">Group Chat</span>
          <span className={`fab-role-pill role-${(activeRole || 'USER').toLowerCase()}`}>
            {activeRole}
          </span>
          {unreadCount > 0 && (
            <span className="fab-unread-badge">{unreadCount}</span>
          )}
        </button>
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
