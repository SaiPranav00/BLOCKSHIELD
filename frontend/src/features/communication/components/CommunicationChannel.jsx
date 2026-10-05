import React, { useState, useEffect, useRef } from 'react';
import {
  getMessages,
  createMessageThread,
  replyToThread,
  delegateTaskToManager,
  executeThreadAction,
  getAllDIDs,
} from '../../../services/api';

/* Clean, modern SVG Icons */
const IconChat = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const IconTask = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <path d="m9 14 2 2 4-4"></path>
  </svg>
);

const IconDirectory = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IconSearch = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconSend = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const IconCheck = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconPlus = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const IconClose = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconExpand = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 3h6v6"></path>
    <path d="M9 21H3v-6"></path>
    <path d="M21 3l-7 7"></path>
    <path d="M3 21l7-7"></path>
  </svg>
);

const IconDrawer = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="15" y1="3" x2="15" y2="21"></line>
  </svg>
);

const IconTarget = ({ size = 14, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

// Map any account / DID to authentic Indian display names and calculate proper 2-letter initials
export const sanitizeIndianName = (rawName, did = '', username = '') => {
  const cleanDid = (did || '').toUpperCase();
  const cleanUser = (username || '').toUpperCase();
  const cleanName = (rawName || '').trim();

  if (cleanDid.includes('ADMIN001') || cleanUser === 'ADMIN001' || cleanName === 'Marcus Chen') {
    return 'Rajesh Verma';
  }
  if (cleanDid.includes('MANAGER001') || cleanUser === 'MANAGER001' || cleanName === 'Elena Vance' || cleanName === 'Daniel Foster') {
    return 'Ananya Sharma';
  }
  if (cleanDid.includes('AUDITOR001') || cleanUser === 'AUDITOR001') {
    return 'Priya Nair';
  }
  if (cleanDid.includes('USER001') || cleanUser === 'USER001' || cleanName === 'Jordan Lee') {
    return 'Arjun Sharma';
  }
  if (cleanDid.includes('N123456') || cleanUser === 'N123456') {
    return 'Vikram Rao';
  }
  if (cleanDid.includes('SNEHA_ROY') || cleanUser === 'SNEHA_ROY') {
    return 'Sneha Roy';
  }

  return cleanName || cleanUser || cleanDid.replace('DID:SIH26125:', '') || 'Authorized Identity';
};

export const getSenderDisplayName = (msg) => {
  if (!msg) return 'Authorized Identity';
  return sanitizeIndianName(msg.senderName, msg.senderDID, msg.senderRole);
};

export const getInitials = (displayName) => {
  if (!displayName) return 'ID';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
};

export default function CommunicationChannel({ activeRole, activeDID, notify, onClose, onLedgerUpdate }) {
  // Default to Full Page workspace mode
  const [isFullPage, setIsFullPage] = useState(true);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTopic, setSearchTopic] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'REQUESTS' | 'GENERAL'

  // Recipient Dropdown State
  const [recipientTarget, setRecipientTarget] = useState('EVERYONE'); // 'EVERYONE' | 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'USER'

  // Quick Request Modal / Form Toggle
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqCategory, setReqCategory] = useState('MINT_NFT');
  const [reqTitle, setReqTitle] = useState('');
  const [reqContent, setReqContent] = useState('');
  const [reqTokenId, setReqTokenId] = useState('');
  const [reqAssetName, setReqAssetName] = useState('');
  const [reqAssetType, setReqAssetType] = useState('EQUIPMENT');

  // Input Message State
  const [replyText, setReplyText] = useState('');

  // Delegation State (Admin -> Manager)
  const [selectedManagerDid, setSelectedManagerDid] = useState('');
  const [managersList, setManagersList] = useState([]);
  const [inlineAllocUserDid, setInlineAllocUserDid] = useState('');

  // Chat Feed auto-scroll ref
  const chatEndRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread?.messages?.length, selectedThread?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [msgRes, didsRes] = await Promise.allSettled([
        getMessages(activeRole, activeDID),
        getAllDIDs(),
      ]);

      let list = [];
      if (msgRes.status === 'fulfilled') {
        const data = msgRes.value?.data || msgRes.value || [];
        const rawList = Array.isArray(data) ? data : [];
        
        const generalThreads = rawList.filter((t) => t.category === 'GENERAL_CHAT');
        const reqThreads = rawList.filter((t) => {
          if (t.category === 'GENERAL_CHAT') return false;
          if (activeRole === 'ADMIN') return true;
          if (t.senderDID === activeDID) return true;
          if (t.targetRole === activeRole) return true;
          if (t.assignedManagerDID === activeDID) return true;
          return false;
        });

        let primaryGeneralThread = null;
        if (generalThreads.length > 0) {
          const mergedMessages = [];
          generalThreads.forEach((gt) => {
            if (gt.messages) {
              gt.messages.forEach((m) => {
                if (!mergedMessages.some((msg) => msg.msgId === m.msgId)) {
                  mergedMessages.push(m);
                }
              });
            }
          });
          primaryGeneralThread = {
            ...generalThreads[0],
            id: generalThreads[0].id || 'thread-general',
            title: 'Organization Public Channel',
            messages: mergedMessages,
          };
        } else {
          primaryGeneralThread = {
            id: 'thread-general',
            title: 'Organization Public Channel',
            category: 'GENERAL_CHAT',
            senderDID: 'did:sih26125:ADMIN001',
            senderRole: 'ADMIN',
            targetRole: 'ALL',
            messages: [
              {
                msgId: 'msg-init-1',
                senderDID: 'did:sih26125:ADMIN001',
                senderName: 'Rajesh Verma',
                senderRole: 'ADMIN',
                recipientTarget: 'EVERYONE',
                content: 'Welcome to the BlockShield Hyperledger Fabric Communication Hub. All roles (Admin, Manager, User, Auditor) can collaborate and dispatch on-chain requests here.',
                timestamp: new Date().toISOString(),
              },
            ],
          };
        }

        list = primaryGeneralThread ? [primaryGeneralThread, ...reqThreads] : reqThreads;
        setThreads(list);
        if (list.length > 0 && !selectedThread) {
          setSelectedThread(list[0]);
        } else if (selectedThread) {
          const updated = list.find((t) => t.id === selectedThread.id);
          if (updated) setSelectedThread(updated);
        }
      }

      if (didsRes.status === 'fulfilled') {
        const didsData = didsRes.value?.data || didsRes.value || [];
        const rawList = Array.isArray(didsData) ? didsData.filter((d) => d.status !== 'REVOKED') : [];

        const mergedMap = new Map();
        rawList.forEach((p) => {
          const cleanName = sanitizeIndianName(p.name, p.did, p.username);
          mergedMap.set(p.did, {
            ...p,
            name: cleanName,
            initials: getInitials(cleanName),
            role: (p.role || 'USER').toUpperCase(),
            status: p.status || 'ACTIVE'
          });
        });

        list.forEach((t) => {
          if (t.senderDID && !mergedMap.has(t.senderDID)) {
            const cleanName = sanitizeIndianName(t.senderName, t.senderDID, t.senderRole);
            mergedMap.set(t.senderDID, {
              did: t.senderDID,
              name: cleanName,
              initials: getInitials(cleanName),
              role: (t.senderRole || 'USER').toUpperCase(),
              status: 'ACTIVE',
            });
          }
        });

        const standardRoles = [
          { did: 'did:sih26125:ADMIN001', username: 'ADMIN001', name: 'Rajesh Verma', role: 'ADMIN', status: 'ACTIVE' },
          { did: 'did:sih26125:MANAGER001', username: 'MANAGER001', name: 'Ananya Sharma', role: 'MANAGER', status: 'ACTIVE' },
          { did: 'did:sih26125:AUDITOR001', username: 'AUDITOR001', name: 'Priya Nair', role: 'AUDITOR', status: 'ACTIVE' },
          { did: 'did:sih26125:USER001', username: 'USER001', name: 'Arjun Sharma', role: 'USER', status: 'ACTIVE' },
          { did: 'did:sih26125:N123456', username: 'N123456', name: 'Vikram Rao', role: 'USER', status: 'ACTIVE' },
          { did: 'did:sih26125:SNEHA_ROY', username: 'SNEHA_ROY', name: 'Sneha Roy', role: 'USER', status: 'ACTIVE' },
        ];
        standardRoles.forEach((sr) => {
          const prev = mergedMap.get(sr.did) || {};
          mergedMap.set(sr.did, {
            ...prev,
            ...sr,
            name: sr.name,
            initials: getInitials(sr.name)
          });
        });

        const fullParticipants = Array.from(mergedMap.values()).filter((p) => {
          if (p.role === 'ADMIN' && p.did !== 'did:sih26125:ADMIN001') {
            return false;
          }
          return true;
        });
        setParticipants(fullParticipants);

        const mgrs = fullParticipants.filter((d) => d.role === 'MANAGER' && d.status !== 'REVOKED');
        setManagersList(mgrs);
        if (mgrs.length > 0 && !selectedManagerDid) {
          setSelectedManagerDid(mgrs[0].did);
        }
      }
    } catch (err) {
      console.error('Failed to load communication channel data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeRole, activeDID]);

  useEffect(() => {
    if (selectedThread?.senderDID) {
      setInlineAllocUserDid(selectedThread.senderDID);
    } else {
      setInlineAllocUserDid('');
    }
  }, [selectedThread?.id, selectedThread?.senderDID]);

  const getActiveUserDisplayName = () => {
    const rawId = (activeDID || '').replace('did:sih26125:', '');
    if (rawId === 'ADMIN001') return 'Rajesh Verma';
    if (rawId === 'MANAGER001') return 'Ananya Sharma';
    if (rawId === 'AUDITOR001') return 'Priya Nair';
    if (rawId === 'USER001') return 'Arjun Sharma';
    if (rawId === 'N123456') return 'Vikram Rao';
    if (rawId === 'SNEHA_ROY') return 'Sneha Roy';
    return rawId;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const targetRoleName = recipientTarget === 'EVERYONE' ? 'ALL' : recipientTarget;
      const activeThreadId = selectedThread?.id || threads[0]?.id || 'thread-general';
      const senderDisplayName = getActiveUserDisplayName();

      if (selectedThread || threads.length > 0) {
        await replyToThread(activeThreadId, {
          senderDID: activeDID,
          senderName: senderDisplayName,
          senderRole: activeRole,
          recipientTarget: targetRoleName,
          content: replyText.trim(),
        });
      } else {
        await createMessageThread({
          category: 'GENERAL_CHAT',
          senderDID: activeDID,
          senderName: senderDisplayName,
          senderRole: activeRole,
          targetRole: targetRoleName,
          title: 'Organization Public Channel',
          content: replyText.trim(),
          details: {},
        });
      }

      setReplyText('');
      loadData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqContent.trim()) {
      return notify('Please fill in request title and details', 'error');
    }

    try {
      let details = {};
      if (reqCategory === 'REGISTER_DID') {
        details = { requestedDID: activeDID, role: 'USER' };
      } else if (reqCategory === 'MINT_NFT') {
        let cleanToken = reqTokenId.trim().replace(/[^\w\d\-:_]/g, '');
        if (!cleanToken.startsWith('NFT-')) {
          cleanToken = `NFT-${cleanToken.replace(/^NFT-?/i, '')}`;
        }
        details = {
          requestedDID: activeDID,
          requestedTokenId: cleanToken,
          assetName: reqAssetName.trim() || reqTitle.trim(),
          assetType: reqAssetType,
        };
      } else if (reqCategory === 'ALLOCATION_REQ') {
        details = {
          requestedDID: activeDID,
          requestedTokenId: reqTokenId.trim(),
        };
      }

      const senderDisplayName = getActiveUserDisplayName();

      await createMessageThread({
        category: reqCategory,
        senderDID: activeDID,
        senderName: senderDisplayName,
        senderRole: activeRole,
        targetRole: reqCategory === 'ALLOCATION_REQ' ? 'MANAGER' : 'ADMIN',
        title: reqTitle.trim(),
        content: reqContent.trim(),
        details,
      });

      notify('Task ticket created and published to channel', 'success');
      setShowRequestModal(false);
      setReqTitle('');
      setReqContent('');
      setReqTokenId('');
      setReqAssetName('');
      loadData();
      if (onLedgerUpdate) onLedgerUpdate();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleExecuteAction = async (actionType, overrideParams = null) => {
    if (!selectedThread) return;

    try {
      await executeThreadAction(selectedThread.id, {
        actorDID: activeDID,
        actionType,
        parameters: overrideParams || selectedThread.details,
      });

      notify(`Action '${actionType}' confirmed and recorded on Hyperledger Fabric ledger`, 'success');
      if (onLedgerUpdate) onLedgerUpdate();
      loadData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr =
        errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() ||
        errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleInlineAllocate = async (targetUserDid) => {
    if (!selectedThread || !targetUserDid) return;
    
    let targetTokenId = selectedThread.details?.requestedTokenId;
    if (!targetTokenId) {
      const fullText = (selectedThread.title || '') + ' ' + (selectedThread.messages?.map(m => m.content).join(' ') || '');
      const match = fullText.match(/NFT-[\w\d\-:_]+/i);
      targetTokenId = match ? match[0] : 'NFT-1001';
    }

    try {
      await executeThreadAction(selectedThread.id, {
        actorDID: activeDID,
        actionType: 'ALLOCATE_NFT',
        parameters: {
          tokenId: targetTokenId,
          ownerDID: targetUserDid,
        },
      });

      notify(`Asset ${targetTokenId} successfully allocated to ${targetUserDid} on Fabric ledger`, 'success');
      setInlineAllocUserDid('');
      if (onLedgerUpdate) onLedgerUpdate();
      loadData();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr =
        errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() ||
        errMsg;
      notify(cleanErr, 'error');
    }
  };

  const activeUsername = getActiveUserDisplayName();

  // Filtered threads for sidebar
  const filteredThreads = threads.filter((t) => {
    if (activeTab === 'GENERAL' && t.category !== 'GENERAL_CHAT') return false;
    if (activeTab === 'REQUESTS' && t.category === 'GENERAL_CHAT') return false;
    if (searchTopic.trim()) {
      const q = searchTopic.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchCat = (t.category || '').toLowerCase().includes(q);
      const matchSender = (t.senderDID || '').toLowerCase().includes(q);
      return matchTitle || matchCat || matchSender;
    }
    return true;
  });

  const renderTaskTicket = (thread) => {
    if (!thread || thread.category === 'GENERAL_CHAT') return null;
    const isCompleted = thread.status === 'COMPLETED' || thread.status === 'RESOLVED';
    const isRejected = thread.status === 'REJECTED' || thread.status === 'DENIED';

    return (
      <div className={`comm-task-card ${isCompleted ? 'is-completed' : isRejected ? 'is-rejected' : 'is-pending'}`}>
        <div className="comm-task-header">
          <div className="comm-task-badge-group">
            <span className="comm-task-type-badge">
              <IconTask size={13} />
              <span>TASK · {thread.category?.replace(/_/g, ' ')}</span>
            </span>
            <span className={`comm-status-pill status-${(thread.status || 'PENDING').toLowerCase()}`}>
              <span className="comm-status-dot" />
              {thread.status || 'PENDING'}
            </span>
          </div>

          <div className="comm-task-initiator-tag font-mono">
            ID: {thread.id?.slice(0, 14)}
          </div>
        </div>

        <h4 className="comm-task-title">{thread.title}</h4>

        <div className="comm-task-meta-grid">
          <div className="comm-meta-item">
            <span className="comm-meta-label">Initiator DID</span>
            <span className="comm-meta-val font-mono truncate" title={thread.senderDID}>
              {thread.senderDID}
            </span>
          </div>

          <div className="comm-meta-item">
            <span className="comm-meta-label">Target Role</span>
            <span className="comm-meta-val">
              <span className={`role-pill role-${(thread.targetRole || 'ADMIN').toLowerCase()}`}>
                {thread.targetRole}
              </span>
            </span>
          </div>

          {thread.details?.requestedTokenId && (
            <div className="comm-meta-item">
              <span className="comm-meta-label">Token ID</span>
              <span className="comm-meta-val font-mono token-highlight">
                {thread.details.requestedTokenId}
              </span>
            </div>
          )}

          {thread.details?.assetName && (
            <div className="comm-meta-item">
              <span className="comm-meta-label">Asset Name</span>
              <span className="comm-meta-val">{thread.details.assetName}</span>
            </div>
          )}
        </div>

        {thread.content && (
          <div className="comm-task-justification">
            <span className="comm-just-label">Details / Rationale:</span>
            <p className="comm-just-text">{thread.content}</p>
          </div>
        )}

        {/* Execution Actions for Admin and Manager */}
        {!isCompleted && !isRejected ? (
          (activeRole === 'ADMIN' || activeRole === 'MANAGER') && (
            <div className="comm-task-action-bar">
              {activeRole === 'ADMIN' &&
                (thread.category === 'REGISTER_DID' || thread.category === 'USER_SIGNUP_REQ') && (
                  <button
                    className="comm-btn-action primary"
                    onClick={() =>
                      handleExecuteAction('REGISTER_DID', {
                        did: thread.details?.requestedDID || thread.senderDID,
                        role: thread.details?.requestedRole || thread.details?.role || 'USER',
                        publicKey: 'RSA-2048-PUBKEY',
                      })
                    }
                  >
                    <IconCheck size={14} />
                    <span>Approve &amp; Issue DID</span>
                  </button>
                )}

              {activeRole === 'ADMIN' && thread.category === 'MINT_NFT' && (
                <button
                  className="comm-btn-action primary"
                  onClick={() =>
                    handleExecuteAction('MINT_NFT', {
                      adminDID: activeDID,
                      tokenId: thread.details?.requestedTokenId || `NFT-${Date.now()}`,
                      assetName: thread.details?.assetName || thread.title,
                      assetType: thread.details?.assetType || 'EQUIPMENT',
                      metadata: '{}',
                    })
                  }
                >
                  <IconCheck size={14} />
                  <span>Approve &amp; Mint Asset</span>
                </button>
              )}

              {(thread.category === 'ALLOCATION_REQ' || thread.category === 'DELEGATE_ALLOCATE') && (
                <button
                  className="comm-btn-action primary"
                  onClick={() =>
                    handleExecuteAction('ALLOCATE_NFT', {
                      tokenId: thread.details?.requestedTokenId || 'NFT-1001',
                      ownerDID: thread.details?.requestedDID || thread.senderDID,
                    })
                  }
                >
                  <IconCheck size={14} />
                  <span>Approve Allocation</span>
                </button>
              )}

              <button
                className="comm-btn-action secondary"
                onClick={() => handleExecuteAction('RESOLVE', {})}
              >
                <span>Mark Resolved</span>
              </button>
            </div>
          )
        ) : (
          <div className={`comm-task-resolution-banner ${isCompleted ? 'success' : 'denied'}`}>
            <IconCheck size={15} />
            <span>
              {isCompleted
                ? 'Task Approved & Authenticated on Hyperledger Fabric Ledger'
                : 'Task Rejected by Governance Administrator'}
            </span>
          </div>
        )}

        {/* Interactive Inline Asset Allocation Dropdown */}
        {(activeRole === 'ADMIN' || activeRole === 'MANAGER') &&
          (thread.category === 'MINT_NFT' || thread.category === 'ALLOCATION_REQ') && (
            <div className="comm-inline-alloc-box">
              <div className="comm-inline-alloc-header">
                <IconTarget size={14} />
                <span>
                  Reassign Asset <strong>{thread.details?.requestedTokenId || 'Asset'}</strong> to Verified User:
                </span>
              </div>
              <div className="comm-inline-alloc-row">
                <select
                  className="comm-styled-select"
                  value={inlineAllocUserDid}
                  onChange={(e) => setInlineAllocUserDid(e.target.value)}
                >
                  <option value="">Select target account from directory...</option>
                  {participants.map((p, idx) => {
                    const displayName = sanitizeIndianName(p.name, p.did, p.username);
                    return (
                      <option key={idx} value={p.did}>
                        {displayName} ({p.role}) — {p.did}
                      </option>
                    );
                  })}
                </select>
                <button
                  className="comm-btn-alloc"
                  onClick={() => handleInlineAllocate(inlineAllocUserDid)}
                  disabled={!inlineAllocUserDid}
                >
                  <IconCheck size={13} />
                  <span>Assign</span>
                </button>
              </div>
              {thread.details?.allocatedToDID && (
                <div className="comm-alloc-confirmed">
                  <IconCheck size={13} />
                  <span>
                    Currently assigned to: <code>{thread.details.allocatedToDID}</code>
                  </span>
                </div>
              )}
            </div>
          )}
      </div>
    );
  };

  const renderMessageFeed = (thread) => {
    if (!thread?.messages || thread.messages.length === 0) {
      return (
        <div className="comm-empty-feed">
          <div className="comm-empty-icon-wrap">
            <IconChat size={28} />
          </div>
          <h4>No Messages in this Channel</h4>
          <p>Begin collaboration by typing a message below or dispatching a task ticket.</p>
        </div>
      );
    }

    const filtered = thread.messages.filter((msg) => {
      const target = msg.recipientTarget || 'EVERYONE';
      if (target === 'EVERYONE' || target === 'ALL') return true;
      if (activeRole === 'ADMIN') return true;
      if (msg.senderDID === activeDID) return true;
      return target === activeRole;
    });

    if (filtered.length === 0) {
      return (
        <div className="comm-empty-feed">
          <p>No messages addressed to your role in this channel.</p>
        </div>
      );
    }

    return filtered.map((msg, idx) => {
      const isMine = msg.senderDID === activeDID;
      const displayName = getSenderDisplayName(msg);
      const initials = getInitials(displayName);
      const role = (msg.senderRole || 'USER').toUpperCase();
      const isDirect = msg.recipientTarget && msg.recipientTarget !== 'ALL' && msg.recipientTarget !== 'EVERYONE';

      return (
        <div key={idx} className={`comm-msg-item ${isMine ? 'is-self' : 'is-other'}`}>
          <div className={`comm-msg-avatar role-avatar-${role.toLowerCase()}`}>
            <span>{initials}</span>
          </div>

          <div className="comm-msg-bubble-wrap">
            <div className="comm-msg-header">
              <span className="comm-msg-name">{displayName}</span>
              <span className={`role-pill role-${role.toLowerCase()}`}>
                {role}
              </span>
              {isDirect ? (
                <span className="comm-direct-pill">
                  To: {(msg.recipientTarget || '').replace(/_/g, ' ')}
                </span>
              ) : (
                <span className="comm-public-pill">
                  Public
                </span>
              )}
              <span className="comm-msg-timestamp">
                {msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
            </div>

            <div className="comm-msg-body">
              <p>{msg.content}</p>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`comm-backdrop ${isFullPage ? 'is-fullpage' : ''}`} onClick={onClose}>
      <div className={`comm-shell ${isFullPage ? 'is-fullpage' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Top Header Bar */}
        <header className="comm-header">
          <div className="comm-header-left">
            <span className="comm-live-status-dot" title="Hyperledger Fabric Consensus Synchronized" />
            <div>
              <div className="comm-title-row">
                <h3 className="comm-main-title">
                  {isFullPage ? 'Enterprise Fabric Operations Hub · Chat & Tasks' : 'Fabric Channel & Tasks'}
                </h3>
                {isFullPage && <span className="comm-workspace-badge">SOVEREIGN WORKSPACE</span>}
              </div>
              <p className="comm-user-meta font-mono">
                Active Session: <strong>{activeUsername}</strong>{' '}
                <span className={`role-pill role-${(activeRole || 'USER').toLowerCase()}`}>{activeRole}</span>{' '}
                <span className="comm-did-label">({activeDID})</span>
              </p>
            </div>
          </div>

          <div className="comm-header-actions">
            <button
              className="comm-btn-hdr"
              onClick={() => setIsFullPage(!isFullPage)}
              title={isFullPage ? 'Switch to Compact Drawer' : 'Expand to Full Page'}
            >
              {isFullPage ? <IconDrawer size={14} /> : <IconExpand size={14} />}
              <span>{isFullPage ? 'Drawer' : 'Full Page'}</span>
            </button>

            <button
              className={`comm-btn-hdr ${showParticipantsList ? 'active' : ''}`}
              onClick={() => setShowParticipantsList(!showParticipantsList)}
              title="Toggle Directory of participants"
            >
              <IconDirectory size={14} />
              <span>Directory ({participants.length || 4})</span>
            </button>

            <button className="comm-btn-close" onClick={onClose} aria-label="Close Hub" title="Close (Esc)">
              <IconClose size={15} />
            </button>
          </div>
        </header>

        {/* Body Layout */}
        <div className={`comm-body ${isFullPage ? 'is-fullpage' : 'is-drawer'}`}>
          {/* Left Navigation Sidebar */}
          <aside className="comm-sidebar">
            <div className="comm-sidebar-top">
              <span className="comm-sidebar-heading">Channels &amp; Tasks</span>
              <button
                className="comm-btn-new-task"
                onClick={() => setShowRequestModal(!showRequestModal)}
                title="Create On-Chain Request Ticket"
              >
                <IconPlus size={13} />
                <span>New Task</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="comm-search-wrap">
              <span className="comm-search-icon">
                <IconSearch size={13} />
              </span>
              <input
                type="text"
                className="comm-search-input"
                placeholder="Search topics & tasks..."
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
              />
            </div>

            {/* Filter Tabs */}
            <div className="comm-nav-tabs">
              <button
                className={`comm-nav-tab ${activeTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveTab('ALL')}
              >
                All ({threads.length})
              </button>
              <button
                className={`comm-nav-tab ${activeTab === 'GENERAL' ? 'active' : ''}`}
                onClick={() => setActiveTab('GENERAL')}
              >
                Public Chat
              </button>
              <button
                className={`comm-nav-tab ${activeTab === 'REQUESTS' ? 'active' : ''}`}
                onClick={() => setActiveTab('REQUESTS')}
              >
                Tasks ({threads.filter((t) => t.category !== 'GENERAL_CHAT').length})
              </button>
            </div>

            {/* Thread List */}
            <div className="comm-threads-scroll">
              {filteredThreads.length === 0 ? (
                <div className="comm-no-threads">No matching channels</div>
              ) : (
                filteredThreads.map((t) => {
                  const isSelected = selectedThread?.id === t.id;
                  const isGeneral = t.category === 'GENERAL_CHAT';
                  return (
                    <div
                      key={t.id}
                      className={`comm-thread-item ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedThread(t)}
                    >
                      <div className="comm-thread-item-icon">
                        {isGeneral ? <IconChat size={15} /> : <IconTask size={15} />}
                      </div>

                      <div className="comm-thread-item-info">
                        <span className="comm-thread-item-title truncate">
                          {t.title}
                        </span>
                        <div className="comm-thread-item-meta">
                          {isGeneral ? (
                            <span className="comm-badge-channel">Public Broadcast</span>
                          ) : (
                            <>
                              <span className="comm-badge-category">{t.category?.replace(/_/g, ' ')}</span>
                              <span className={`comm-status-dot-text status-${(t.status || 'PENDING').toLowerCase()}`}>
                                {t.status || 'PENDING'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Directory Section */}
            <div className="comm-sidebar-directory">
              <div className="comm-dir-header">
                <span className="comm-dir-title">
                  <IconDirectory size={13} />
                  <span>Network Directory</span>
                </span>
                <span className="comm-dir-count">{participants.length || 4} Identities</span>
              </div>

              <div className="comm-dir-list">
                {participants.map((p, idx) => {
                  const displayName = sanitizeIndianName(p.name, p.did, p.username);
                  const isMe = p.did === activeDID;
                  const role = (p.role || 'USER').toUpperCase();
                  const initials = p.initials || getInitials(displayName);

                  return (
                    <div
                      key={idx}
                      className="comm-dir-row"
                      onClick={() => setRecipientTarget(p.role || 'EVERYONE')}
                      title={`Target message to ${displayName} (${p.role})`}
                    >
                      <span className={`comm-dir-avatar role-avatar-${role.toLowerCase()}`}>
                        {initials}
                      </span>
                      <div className="comm-dir-text">
                        <span className="comm-dir-name truncate">{displayName}</span>
                        <span className="comm-dir-sub truncate font-mono">{p.did}</span>
                      </div>
                      <span className={`role-pill role-${role.toLowerCase()}`}>{role}</span>
                      {isMe && <span className="comm-you-pill">You</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right Main Channel & Feed Area */}
          <main className="comm-main-panel">
            {/* Main Header / Channel Bar */}
            <div className="comm-channel-bar">
              <div className="comm-channel-bar-info">
                <div className="comm-channel-headline">
                  <span className="comm-channel-icon-pill">
                    {selectedThread?.category === 'GENERAL_CHAT' ? (
                      <IconChat size={16} />
                    ) : (
                      <IconTask size={16} />
                    )}
                  </span>
                  <h4 className="comm-channel-heading">
                    {selectedThread?.title || 'Organization Public Channel'}
                  </h4>
                  {selectedThread?.category !== 'GENERAL_CHAT' && (
                    <span className={`comm-status-pill status-${(selectedThread?.status || 'PENDING').toLowerCase()}`}>
                      <span className="comm-status-dot" />
                      {selectedThread?.status || 'PENDING'}
                    </span>
                  )}
                </div>

                <div className="comm-channel-sub font-mono">
                  <span>Type: <strong>{selectedThread?.category || 'GENERAL_CHAT'}</strong></span>
                  {selectedThread?.targetRole && (
                    <span> · Target Role: <strong>{selectedThread.targetRole}</strong></span>
                  )}
                  {selectedThread?.senderDID && (
                    <span> · Initiator: <code>{selectedThread.senderDID}</code></span>
                  )}
                </div>
              </div>

              <div className="comm-channel-bar-actions">
                <button
                  className="comm-btn-new-task"
                  onClick={() => setShowRequestModal(!showRequestModal)}
                >
                  <IconPlus size={13} />
                  <span>New Request</span>
                </button>
              </div>
            </div>

            {/* Request Creation Form Drawer / Box (If Open) */}
            {showRequestModal && (
              <div className="comm-req-modal-box">
                <div className="comm-req-modal-top">
                  <span className="comm-req-modal-kicker">DISPATCH ON-CHAIN REQUEST TICKET</span>
                  <button className="comm-btn-close-sm" onClick={() => setShowRequestModal(false)}>
                    <IconClose size={13} />
                  </button>
                </div>

                <form onSubmit={handleCreateRequest} className="comm-req-form">
                  <div className="comm-form-row">
                    <div className="comm-form-field">
                      <label className="comm-form-label">Request Type</label>
                      <select
                        className="comm-form-select"
                        value={reqCategory}
                        onChange={(e) => setReqCategory(e.target.value)}
                      >
                        <option value="MINT_NFT">Request NFT Asset Minting (Admin)</option>
                        <option value="REGISTER_DID">Request Identity Registration (Admin)</option>
                        <option value="ALLOCATION_REQ">Request Asset Allocation (Manager)</option>
                        <option value="GENERAL_CHAT">General Priority Discussion</option>
                      </select>
                    </div>

                    <div className="comm-form-field">
                      <label className="comm-form-label">Task Title</label>
                      <input
                        type="text"
                        className="comm-form-input"
                        value={reqTitle}
                        onChange={(e) => setReqTitle(e.target.value)}
                        placeholder="e.g. Spectrum Analyzer Requisition"
                        required
                      />
                    </div>
                  </div>

                  {reqCategory === 'MINT_NFT' && (
                    <div className="comm-form-row">
                      <div className="comm-form-field">
                        <label className="comm-form-label">Requested Token ID</label>
                        <input
                          type="text"
                          className="comm-form-input font-mono"
                          value={reqTokenId}
                          onChange={(e) => setReqTokenId(e.target.value)}
                          placeholder="e.g. NFT-SEC-COMM-2026"
                          required
                        />
                      </div>
                      <div className="comm-form-field">
                        <label className="comm-form-label">Asset Name</label>
                        <input
                          type="text"
                          className="comm-form-input"
                          value={reqAssetName}
                          onChange={(e) => setReqAssetName(e.target.value)}
                          placeholder="e.g. Secure Communication Device"
                        />
                      </div>
                    </div>
                  )}

                  <div className="comm-form-field">
                    <label className="comm-form-label">Details &amp; Operational Justification</label>
                    <textarea
                      className="comm-form-textarea"
                      rows={2}
                      value={reqContent}
                      onChange={(e) => setReqContent(e.target.value)}
                      placeholder="Explain the operational rationale and required specifications..."
                      required
                    />
                  </div>

                  <div className="comm-form-actions">
                    <button
                      type="button"
                      className="comm-btn-action secondary"
                      onClick={() => setShowRequestModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="comm-btn-action primary">
                      <IconCheck size={14} />
                      <span>Post Task Ticket</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Chat & Task Scroll Area */}
            <div className="comm-feed-container">
              {/* Fabric Network Status Banner */}
              <div className="comm-feed-notice">
                <span className="comm-notice-pill">
                  <span className="comm-status-dot-sm" />
                  Hyperledger Fabric Enterprise Network · Endorsed Consensus Active
                </span>
              </div>

              {/* Highlighted Request Task Ticket (If Thread is a Task) */}
              {selectedThread && renderTaskTicket(selectedThread)}

              {/* Messages Feed */}
              {renderMessageFeed(selectedThread)}

              <div ref={chatEndRef} />
            </div>

            {/* Message Input Bar */}
            <form onSubmit={handleSendMessage} className="comm-input-bar">
              <div className="comm-input-top-bar">
                <div className="comm-recipient-group">
                  <span className="comm-recipient-lbl">To:</span>
                  <select
                    className="comm-recipient-select"
                    value={recipientTarget}
                    onChange={(e) => setRecipientTarget(e.target.value)}
                  >
                    <option value="EVERYONE">Everyone (Public Channel)</option>
                    <option value="ADMIN">ADMIN (Executive Administrators)</option>
                    <option value="MANAGER">MANAGER (Operations Managers)</option>
                    <option value="AUDITOR">AUDITOR (Compliance &amp; Audit)</option>
                    <option value="USER">USER (General Accounts)</option>
                  </select>
                </div>

                <div className="comm-session-auth font-mono">
                  Posting as: <strong>{activeUsername}</strong> [{activeRole}]
                </div>
              </div>

              <div className="comm-input-row">
                <input
                  type="text"
                  className="comm-text-input"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Send message to ${recipientTarget === 'EVERYONE' ? 'everyone' : recipientTarget}...`}
                  required
                />
                <button type="submit" className="comm-btn-send">
                  <IconSend size={14} />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}
