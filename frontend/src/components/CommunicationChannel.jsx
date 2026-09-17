import React, { useState, useEffect } from 'react';
import {
  getMessages,
  createMessageThread,
  replyToThread,
  delegateTaskToManager,
  executeThreadAction,
  getAllDIDs,
  getAllNFTs,
} from '../services/api';

export default function CommunicationChannel({ activeRole, activeDID, notify, onClose }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(false);

  // New Request Form State
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [reqCategory, setReqCategory] = useState('MINT_NFT'); // 'REGISTER_DID', 'MINT_NFT', 'ALLOCATION_REQ', 'GENERAL_CHAT'
  const [reqTitle, setReqTitle] = useState('');
  const [reqContent, setReqContent] = useState('');

  // Request Details
  const [reqTokenId, setReqTokenId] = useState('');
  const [reqAssetName, setReqAssetName] = useState('');
  const [reqAssetType, setReqAssetType] = useState('CERTIFICATE');
  const [reqMetadata, setReqMetadata] = useState('{"issuer":"IIT Madras","year":"2026"}');
  const [reqTargetDid, setReqTargetDid] = useState('');

  // Reply Form State
  const [replyText, setReplyText] = useState('');

  // Delegation State (Admin -> Manager)
  const [selectedManagerDid, setSelectedManagerDid] = useState('');
  const [delegationNote, setDelegationNote] = useState('');
  const [managersList, setManagersList] = useState([]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const res = await getMessages(activeRole, activeDID);
      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : [];
      setThreads(list);
      if (list.length > 0 && !selectedThread) {
        setSelectedThread(list[0]);
      } else if (selectedThread) {
        const updated = list.find(t => t.id === selectedThread.id);
        if (updated) setSelectedThread(updated);
      }
    } catch (err) {
      console.error('Failed to load message threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const res = await getAllDIDs();
      const dids = res?.data || res || [];
      if (Array.isArray(dids)) {
        const mgrs = dids.filter(d => d.role === 'MANAGER' && d.status !== 'REVOKED');
        setManagersList(mgrs);
        if (mgrs.length > 0 && !selectedManagerDid) {
          setSelectedManagerDid(mgrs[0].did);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadThreads();
    if (activeRole === 'ADMIN') {
      loadManagers();
    }
  }, [activeRole, activeDID]);

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqContent.trim()) {
      return notify('Please fill in title and message content', 'error');
    }

    try {
      let details = {};
      if (reqCategory === 'REGISTER_DID') {
        let cleanDid = reqTargetDid.trim() || activeDID;
        if (!cleanDid.startsWith('did:sih26125:')) {
          cleanDid = `did:sih26125:${cleanDid.replace(/^did:[^:]+:/i, '')}`;
        }
        details = { requestedDID: cleanDid, role: 'USER' };
      } else if (reqCategory === 'MINT_NFT') {
        let cleanToken = reqTokenId.trim().replace(/[^\w\d\-:_]/g, '');
        if (!cleanToken.startsWith('NFT-')) {
          cleanToken = `NFT-${cleanToken.replace(/^NFT-?/i, '')}`;
        }
        details = {
          requestedDID: activeDID,
          requestedTokenId: cleanToken,
          assetName: reqAssetName.trim(),
          assetType: reqAssetType,
          metadata: reqMetadata,
        };
      } else if (reqCategory === 'ALLOCATION_REQ') {
        details = {
          requestedDID: activeDID,
          requestedTokenId: reqTokenId.trim(),
        };
      }

      await createMessageThread({
        category: reqCategory,
        senderDID: activeDID,
        senderName: activeDID.replace('did:sih26125:', ''),
        senderRole: activeRole,
        targetRole: reqCategory === 'ALLOCATION_REQ' ? 'MANAGER' : 'ADMIN',
        title: reqTitle.trim(),
        content: reqContent.trim(),
        details,
      });

      notify('Request message sent to Communication Channel!', 'success');
      setShowNewRequestForm(false);
      setReqTitle('');
      setReqContent('');
      setReqTokenId('');
      setReqAssetName('');
      loadThreads();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;

    try {
      await replyToThread(selectedThread.id, {
        senderDID: activeDID,
        senderName: activeDID.replace('did:sih26125:', ''),
        senderRole: activeRole,
        content: replyText.trim(),
      });

      setReplyText('');
      notify('Reply posted', 'success');
      loadThreads();
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

      notify(`Action '${actionType}' executed live on Hyperledger Fabric ledger!`, 'success');
      loadThreads();
    } catch (err) {
      const errMsg = err.message || '';
      const cleanErr = errMsg.replace(/10 ABORTED: failed to endorse transaction, see attached details for more info|EvaluateError:|TransactionError:/gi, '').trim() || errMsg;
      notify(cleanErr, 'error');
    }
  };

  const handleDelegateToManager = async (e) => {
    e.preventDefault();
    if (!selectedThread || !selectedManagerDid) {
      return notify('Please select a manager to delegate task', 'error');
    }

    try {
      await delegateTaskToManager(selectedThread.id, {
        managerDID: selectedManagerDid,
        note: delegationNote.trim(),
        adminDID: activeDID,
      });

      notify(`Task delegated to Manager ${selectedManagerDid}`, 'success');
      setDelegationNote('');
      loadThreads();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card modal-container comm-channel-modal">
        {/* Header Bar */}
        <div className="flex-between card-header-row border-bottom pb-2 mb-3">
          <div>
            <h3 className="card-title">Role Communication & Work Dispatch Channel</h3>
            <p className="card-desc">
              Connected as: <code>{activeDID}</code> <span className={`role-pill role-${activeRole.toLowerCase()}`}>{activeRole}</span>
            </p>
          </div>
          <div className="flex-gap">
            <button
              className="btn btn-xs btn-primary"
              onClick={() => setShowNewRequestForm(!showNewRequestForm)}
            >
              {showNewRequestForm ? 'Close Form' : '+ New Request / Message'}
            </button>
            <button className="btn btn-xs btn-outline" onClick={onClose}>
              Close Channel
            </button>
          </div>
        </div>

        {/* New Request Creation Form Panel */}
        {showNewRequestForm && (
          <div className="glass-card mb-3 p-3 bg-card-alt">
            <h4 className="card-subtitle mb-2">Submit New Asset / DID Request</h4>
            <form onSubmit={handleCreateThread} className="form-layout">
              <div className="form-group">
                <label className="label">Request Category:</label>
                <select
                  className="input"
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                >
                  <option value="MINT_NFT">Request NFT Asset Minting (Admin)</option>
                  <option value="REGISTER_DID">Request Identity (DID) Registration (Admin)</option>
                  <option value="ALLOCATION_REQ">Request Asset Allocation (Manager)</option>
                  <option value="GENERAL_CHAT">General Message / Inquiry</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Request Title:</label>
                <input
                  type="text"
                  className="input"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="e.g. Requesting B.Tech Degree Certificate Token"
                  required
                />
              </div>

              {reqCategory === 'MINT_NFT' && (
                <>
                  <div className="form-group">
                    <label className="label">Requested Token ID:</label>
                    <input
                      type="text"
                      className="input"
                      value={reqTokenId}
                      onChange={(e) => setReqTokenId(e.target.value)}
                      placeholder="e.g. NFT-CERT-BTECH-2026"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Asset Title / Name:</label>
                    <input
                      type="text"
                      className="input"
                      value={reqAssetName}
                      onChange={(e) => setReqAssetName(e.target.value)}
                      placeholder="e.g. Bachelor of Technology Degree"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Asset Type:</label>
                    <select
                      className="input"
                      value={reqAssetType}
                      onChange={(e) => setReqAssetType(e.target.value)}
                    >
                      <option value="CERTIFICATE">CERTIFICATE</option>
                      <option value="PROPERTY">PROPERTY TITLE</option>
                      <option value="PATENT">PATENT</option>
                      <option value="LICENSE">LICENSE</option>
                    </select>
                  </div>
                </>
              )}

              {reqCategory === 'REGISTER_DID' && (
                <div className="form-group">
                  <label className="label">Requested DID (Optional):</label>
                  <input
                    type="text"
                    className="input"
                    value={reqTargetDid}
                    onChange={(e) => setReqTargetDid(e.target.value)}
                    placeholder="e.g. did:sih26125:NEW_USER_01"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="label">Message Details & Context:</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={reqContent}
                  onChange={(e) => setReqContent(e.target.value)}
                  placeholder="Explain your request for Admin or Manager review..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Send Request Message
              </button>
            </form>
          </div>
        )}

        {/* Main Grid: Threads Sidebar + Active Chat Workspace */}
        <div className="comm-grid">
          {/* Sidebar: Thread List */}
          <div className="thread-sidebar">
            <div className="flex-between mb-2">
              <h4 className="section-subtitle">Messages ({threads.length})</h4>
              <button className="btn btn-xs btn-secondary" onClick={loadThreads} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="thread-list-scroll">
              {threads.length === 0 ? (
                <p className="text-muted text-xs p-2">No messages or requests found.</p>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.id}
                    className={`thread-card-item ${selectedThread?.id === t.id ? 'active' : ''}`}
                    onClick={() => setSelectedThread(t)}
                  >
                    <div className="flex-between">
                      <span className="thread-title">{t.title}</span>
                      <span className={`status-pill status-${(t.status || 'PENDING').toLowerCase()}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="flex-between mt-1 text-xs text-muted">
                      <span>Sender: <code>{t.senderName || t.senderDID}</code></span>
                      <span className="badge badge-neutral">{t.category}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Area: Active Thread Conversation & Actionable Task Dispatch */}
          <div className="thread-main">
            {selectedThread ? (
              <div className="thread-workspace">
                {/* Thread Header Info */}
                <div className="thread-header border-bottom pb-2 mb-3">
                  <div className="flex-between">
                    <h4>{selectedThread.title}</h4>
                    <span className={`status-pill status-${(selectedThread.status || 'PENDING').toLowerCase()}`}>
                      {selectedThread.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Category: <strong>{selectedThread.category}</strong> | Target: <strong>{selectedThread.targetRole}</strong>
                    {selectedThread.assignedManagerDID && (
                      <> | Delegated to Manager: <code>{selectedThread.assignedManagerDID}</code></>
                    )}
                  </p>
                </div>

                {/* ACTIONABLE EXECUTION PANELS (Role-Based On-Chain Operations) */}
                <div className="actionable-panel mb-3">
                  {/* ADMIN ACTION 1: Approve & Register DID */}
                  {activeRole === 'ADMIN' && selectedThread.category === 'REGISTER_DID' && selectedThread.status !== 'COMPLETED' && (
                    <div className="card-callout border-primary p-2 mb-2">
                      <p className="text-xs font-bold mb-1">Admin Action: Approve & Register Identity on Ledger</p>
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => handleExecuteAction('REGISTER_DID', {
                          did: selectedThread.details?.requestedDID || selectedThread.senderDID,
                          role: selectedThread.details?.role || 'USER',
                          publicKey: 'RSA-2048-PUBLIC-KEY-GEN',
                        })}
                      >
                        Approve & Register DID Live on Fabric
                      </button>
                    </div>
                  )}

                  {/* ADMIN ACTION 2: Approve & Mint Asset (Exclusive Admin Right) */}
                  {activeRole === 'ADMIN' && selectedThread.category === 'MINT_NFT' && selectedThread.status !== 'COMPLETED' && (
                    <div className="card-callout border-success p-2 mb-2">
                      <p className="text-xs font-bold mb-1">Admin Action: Approve & Mint Asset on Ledger</p>
                      <div className="flex-gap mb-2">
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() => handleExecuteAction('MINT_NFT', {
                            adminDID: activeDID,
                            tokenId: selectedThread.details?.requestedTokenId || `NFT-${Date.now()}`,
                            assetName: selectedThread.details?.assetName || selectedThread.title,
                            assetType: selectedThread.details?.assetType || 'CERTIFICATE',
                            metadata: selectedThread.details?.metadata || '{}',
                          })}
                        >
                          Approve & Mint Asset Live on Fabric
                        </button>
                      </div>

                      {/* ADMIN TASK DELEGATION TO MANAGER */}
                      <form onSubmit={handleDelegateToManager} className="flex-gap">
                        <select
                          className="input input-xs flex-1"
                          value={selectedManagerDid}
                          onChange={(e) => setSelectedManagerDid(e.target.value)}
                        >
                          <option value="">-- Select Manager to Delegate Allocation --</option>
                          {managersList.map((m, idx) => (
                            <option key={idx} value={m.did}>{m.did}</option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-xs btn-secondary">
                          Delegate Task to Manager
                        </button>
                      </form>
                    </div>
                  )}

                  {/* ADMIN or MANAGER ACTION 3: Asset Allocation */}
                  {(selectedThread.category === 'ALLOCATION_REQ' || selectedThread.category === 'DELEGATE_ALLOCATE') && selectedThread.status !== 'COMPLETED' && (
                    <div className="card-callout border-warning p-2 mb-2">
                      <p className="text-xs font-bold mb-1">
                        {activeRole === 'ADMIN' ? 'Admin / Manager Action: Execute Asset Allocation' : 'Manager Action: Execute Asset Allocation'}
                      </p>
                      <div className="flex-gap">
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() => handleExecuteAction('ALLOCATE_NFT', {
                            tokenId: selectedThread.details?.requestedTokenId || 'NFT-CERT-999',
                            ownerDID: selectedThread.details?.requestedDID || selectedThread.senderDID,
                          })}
                        >
                          Execute Asset Allocation Live on Ledger
                        </button>

                        {activeRole === 'ADMIN' && (
                          <form onSubmit={handleDelegateToManager} className="flex-gap flex-1 ml-2">
                            <select
                              className="input input-xs flex-1"
                              value={selectedManagerDid}
                              onChange={(e) => setSelectedManagerDid(e.target.value)}
                            >
                              <option value="">-- Delegate to Manager --</option>
                              {managersList.map((m, idx) => (
                                <option key={idx} value={m.did}>{m.did}</option>
                              ))}
                            </select>
                            <button type="submit" className="btn btn-xs btn-secondary">
                              Delegate
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}

                  {/* GENERAL / RESOLUTION ACTION */}
                  {(selectedThread.category === 'GENERAL_CHAT' || selectedThread.status === 'PENDING') && selectedThread.status !== 'COMPLETED' && (activeRole === 'ADMIN' || activeRole === 'MANAGER') && selectedThread.category !== 'REGISTER_DID' && selectedThread.category !== 'MINT_NFT' && selectedThread.category !== 'ALLOCATION_REQ' && selectedThread.category !== 'DELEGATE_ALLOCATE' && (
                    <div className="card-callout border-primary p-2 mb-2">
                      <p className="text-xs font-bold mb-1">Resolve Request</p>
                      <button
                        className="btn btn-xs btn-secondary"
                        onClick={() => handleExecuteAction('RESOLVE', {})}
                      >
                        Mark Request as Resolved
                      </button>
                    </div>
                  )}
                </div>

                {/* Conversation History Messages */}
                <div className="chat-messages-container">
                  {selectedThread.messages?.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat-bubble-row ${msg.senderDID === activeDID ? 'bubble-mine' : 'bubble-other'}`}
                    >
                      <div className="chat-bubble">
                        <div className="bubble-header">
                          <span className="bubble-sender">{msg.senderName || msg.senderDID}</span>
                          <span className={`role-pill role-${(msg.senderRole || 'USER').toLowerCase()}`}>
                            {msg.senderRole}
                          </span>
                        </div>
                        <p className="bubble-text">{msg.content}</p>
                        <span className="bubble-time">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleReply} className="reply-form-row border-top pt-2 mt-2">
                  <input
                    type="text"
                    className="input input-sm flex-1"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message or response..."
                    required
                  />
                  <button type="submit" className="btn btn-sm btn-primary">
                    Send Reply
                  </button>
                </form>
              </div>
            ) : (
              <div className="empty-state-box p-4">
                <p>Select a message thread from the sidebar to view conversation or execute tasks.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
