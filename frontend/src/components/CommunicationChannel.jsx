import React, { useState, useEffect } from 'react';
import {
  getMessages,
  createMessageThread,
  replyToThread,
  delegateTaskToManager,
  executeThreadAction,
  getAllDIDs,
} from '../services/api';

export default function CommunicationChannel({ activeRole, activeDID, notify, onClose }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [loading, setLoading] = useState(false);

  // Zoom-style "To:" Recipient Dropdown State
  const [recipientTarget, setRecipientTarget] = useState('EVERYONE'); // 'EVERYONE' | 'ADMIN' | 'MANAGER' | 'AUDITOR' | specific DID

  // Quick Request Modal / Form Toggle
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqCategory, setReqCategory] = useState('MINT_NFT');
  const [reqTitle, setReqTitle] = useState('');
  const [reqContent, setReqContent] = useState('');
  const [reqTokenId, setReqTokenId] = useState('');
  const [reqAssetName, setReqAssetName] = useState('');
  const [reqAssetType, setReqAssetType] = useState('CERTIFICATE');

  // Input Message State
  const [replyText, setReplyText] = useState('');

  // Delegation State (Admin -> Manager)
  const [selectedManagerDid, setSelectedManagerDid] = useState('');
  const [managersList, setManagersList] = useState([]);
  const [inlineAllocUserDid, setInlineAllocUserDid] = useState('');

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
            title: 'Organization Group Chat',
            messages: mergedMessages,
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

        // Also merge any sender DID from message threads (e.g. MRUDULA) into participants
        const mergedMap = new Map();
        rawList.forEach((p) => mergedMap.set(p.did, p));

        list.forEach((t) => {
          if (t.senderDID && !mergedMap.has(t.senderDID)) {
            mergedMap.set(t.senderDID, {
              did: t.senderDID,
              role: t.senderRole || 'USER',
              status: 'ACTIVE',
            });
          }
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
      console.error('Failed to load group chat data:', err);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const targetRoleName = recipientTarget === 'EVERYONE' ? 'ALL' : recipientTarget;
      const activeThreadId = selectedThread?.id || threads[0]?.id || 'thread-general';

      if (selectedThread || threads.length > 0) {
        await replyToThread(activeThreadId, {
          senderDID: activeDID,
          senderName: activeDID.replace('did:sih26125:', ''),
          senderRole: activeRole,
          recipientTarget: targetRoleName,
          content: replyText.trim(),
        });
      } else {
        await createMessageThread({
          category: 'GENERAL_CHAT',
          senderDID: activeDID,
          senderName: activeDID.replace('did:sih26125:', ''),
          senderRole: activeRole,
          targetRole: targetRoleName,
          title: 'Organization Group Chat',
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

      notify('Highlighted request card posted to group chat!', 'success');
      setShowRequestModal(false);
      setReqTitle('');
      setReqContent('');
      setReqTokenId('');
      setReqAssetName('');
      loadData();
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

      notify(`Action '${actionType}' executed live on Hyperledger Fabric!`, 'success');
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
      targetTokenId = match ? match[0] : 'NFT-DEGREE-2026';
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

      notify(`Asset ${targetTokenId} successfully allocated to ${targetUserDid} on Fabric!`, 'success');
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

  const activeUsername = activeDID.replace('did:sih26125:', '');

  return (
    <div className="zoom-chatbox-backdrop" onClick={onClose}>
      <div className="zoom-chatbox-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Zoom-style Header */}
        <div className="zoom-chat-header">
          <div className="zoom-header-main">
            <span className="zoom-live-dot"></span>
            <div>
              <h3 className="zoom-chat-title">Group Chat · Fabric Network</h3>
              <p className="zoom-chat-user font-mono">
                You: <strong>{activeUsername}</strong> ({activeRole})
              </p>
            </div>
          </div>

          <div className="zoom-header-actions">
            <button
              className={`btn-participants-toggle ${showParticipantsList ? 'active' : ''}`}
              onClick={() => setShowParticipantsList(!showParticipantsList)}
              title="View Channel Participants"
            >
              👥 {participants.length || 4}
            </button>
            <button className="btn-zoom-close" onClick={onClose} aria-label="Close Chat">
              ✕
            </button>
          </div>
        </div>

        {/* Expandable Participants / Active Users Panel */}
        {showParticipantsList && (
          <div className="zoom-participants-panel">
            <div className="panel-heading">
              <span>Channel Participants ({participants.length || 4})</span>
              <span className="text-xs text-muted">Fabric Directory</span>
            </div>
            <div className="participants-scroll">
              {participants.map((p, idx) => (
                <div key={idx} className="participant-row">
                  <span className="participant-avatar">{p.did.slice(-2).toUpperCase()}</span>
                  <div className="participant-info">
                    <span className="participant-did">{p.did}</span>
                    <span className={`role-pill role-${(p.role || 'USER').toLowerCase()}`}>
                      {p.role}
                    </span>
                  </div>
                  {p.did === activeDID && <span className="you-badge">(You)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thread Category Selector Bar */}
        <div className="zoom-thread-selector-bar">
          <span className="thread-bar-label">Topic:</span>
          {threads.length === 0 ? (
            <span className="text-xs text-muted">Public Channel (General)</span>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                className={`zoom-topic-pill ${selectedThread?.id === t.id ? 'active' : ''}`}
                onClick={() => setSelectedThread(t)}
              >
                <span>{t.title}</span>
                {t.category !== 'GENERAL_CHAT' && <span className="req-pill-icon">📋</span>}
              </button>
            ))
          )}
          <button
            className="btn-create-req-pill"
            onClick={() => setShowRequestModal(!showRequestModal)}
            title="Create Highlighted Request"
          >
            + New Request
          </button>
        </div>

        {/* Highlighting Request Submission Form Modal Overlay */}
        {showRequestModal && (
          <div className="request-modal-box">
            <div className="modal-header-row">
              <span className="req-box-kicker">HIGHLIGHTED ON-CHAIN REQUEST</span>
              <button className="btn-xs btn-outline" onClick={() => setShowRequestModal(false)}>
                ✕ Close
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="form-layout mt-2">
              <div className="form-group">
                <label className="label">Request Type:</label>
                <select
                  className="input input-sm styled-select"
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                >
                  <option value="MINT_NFT">Request NFT Asset Minting (Admin)</option>
                  <option value="REGISTER_DID">Request Identity Registration (Admin)</option>
                  <option value="ALLOCATION_REQ">Request Asset Allocation (Manager)</option>
                  <option value="GENERAL_CHAT">General Highlighted Topic</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Title:</label>
                <input
                  type="text"
                  className="input input-sm"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="e.g. Degree Certificate Minting Request"
                  required
                />
              </div>

              {reqCategory === 'MINT_NFT' && (
                <div className="form-group">
                  <label className="label">Requested Token ID:</label>
                  <input
                    type="text"
                    className="input input-sm"
                    value={reqTokenId}
                    onChange={(e) => setReqTokenId(e.target.value)}
                    placeholder="e.g. NFT-CERT-BTECH-2026"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="label">Details &amp; Rationale:</label>
                <textarea
                  className="input input-sm"
                  rows={2}
                  value={reqContent}
                  onChange={(e) => setReqContent(e.target.value)}
                  placeholder="Provide context for review..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-sm">
                Post Highlighted Request Card
              </button>
            </form>
          </div>
        )}

        {/* Chat Feed Scroll Container */}
        <div className="zoom-chat-feed">
          {/* Channel System Entry Notification */}
          <div className="system-join-notice">
            <span>System: Connected to Fabric Organization Group Channel.</span>
          </div>

          {selectedThread ? (
            <>
              {/* Highlighted Request Callout Card (If Thread is a Request) */}
              {selectedThread.category !== 'GENERAL_CHAT' && (
                <div className={`highlighted-request-card ${selectedThread.status === 'COMPLETED' || selectedThread.status === 'RESOLVED' ? 'completed' : ''}`}>
                  <div className="req-card-header">
                    <span className="req-card-badge">
                      HIGHLIGHTED REQUEST: {selectedThread.category}
                    </span>
                    <span className={`status-pill status-${(selectedThread.status || 'PENDING').toLowerCase()}`}>
                      {selectedThread.status}
                    </span>
                  </div>

                  <h4 className="req-card-title">{selectedThread.title}</h4>
                  <p className="req-card-details">
                    From: <code>{selectedThread.senderDID}</code> | Target: <strong>{selectedThread.targetRole}</strong>
                    {selectedThread.details?.requestedTokenId && (
                      <span className="block mt-1">Token ID: <code>{selectedThread.details.requestedTokenId}</code></span>
                    )}
                  </p>

                  {/* Execution Action Dispatch for Admin/Manager */}
                  {selectedThread.status !== 'COMPLETED' && selectedThread.status !== 'RESOLVED' ? (
                    (activeRole === 'ADMIN' || activeRole === 'MANAGER') && (
                      <div className="req-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {activeRole === 'ADMIN' && (selectedThread.category === 'REGISTER_DID' || selectedThread.category === 'USER_SIGNUP_REQ') && (
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() =>
                              handleExecuteAction('REGISTER_DID', {
                                did: selectedThread.details?.requestedDID || selectedThread.senderDID,
                                role: selectedThread.details?.requestedRole || selectedThread.details?.role || 'USER',
                                publicKey: 'RSA-2048-PUBKEY',
                              })
                            }
                            title="1-Click Direct Approval & On-Chain DID Registration"
                          >
                            1-Click Approve &amp; Issue DID
                          </button>
                        )}

                        {activeRole === 'ADMIN' && selectedThread.category === 'MINT_NFT' && (
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() =>
                              handleExecuteAction('MINT_NFT', {
                                adminDID: activeDID,
                                tokenId: selectedThread.details?.requestedTokenId || `NFT-${Date.now()}`,
                                assetName: selectedThread.details?.assetName || selectedThread.title,
                                assetType: selectedThread.details?.assetType || 'CERTIFICATE',
                                metadata: '{}',
                              })
                            }
                            title="1-Click Direct Approval & On-Chain NFT Asset Minting"
                          >
                            1-Click Approve &amp; Mint NFT
                          </button>
                        )}

                        {(selectedThread.category === 'ALLOCATION_REQ' || selectedThread.category === 'DELEGATE_ALLOCATE') && (
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() =>
                              handleExecuteAction('ALLOCATE_NFT', {
                                tokenId: selectedThread.details?.requestedTokenId || 'NFT-CERT-001',
                                ownerDID: selectedThread.details?.requestedDID || selectedThread.senderDID,
                                })
                            }
                            title="1-Click Direct Approval & On-Chain Asset Allocation"
                          >
                            1-Click Execute Allocation
                          </button>
                        )}

                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => handleExecuteAction('RESOLVE', {})}
                        >
                          Mark Resolved
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="req-completed-banner">
                      ✓ COMPLETED &amp; EXECUTED ON FABRIC LEDGER
                    </div>
                  )}

                  {/* Interactive Inline Asset Allocation Dropdown for Created/Minted Assets */}
                  {(activeRole === 'ADMIN' || activeRole === 'MANAGER') && (selectedThread.category === 'MINT_NFT' || selectedThread.category === 'ALLOCATION_REQ') && (
                    <div className="inline-alloc-container">
                      <label className="inline-alloc-label">
                        🎯 Allocate Asset (<strong>{selectedThread.details?.requestedTokenId || 'Minted Asset'}</strong>) to Target User:
                      </label>
                      <div className="inline-alloc-row">
                        <select
                          className="styled-select inline-alloc-select"
                          value={inlineAllocUserDid}
                          onChange={(e) => setInlineAllocUserDid(e.target.value)}
                        >
                          <option value="">-- Select Target User from Directory --</option>
                          {participants.map((p, idx) => (
                            <option key={idx} value={p.did}>
                              {p.did} [{p.role}]
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-xs btn-primary inline-alloc-btn"
                          onClick={() => handleInlineAllocate(inlineAllocUserDid)}
                          disabled={!inlineAllocUserDid}
                        >
                          Allocate
                        </button>
                      </div>
                      {selectedThread.details?.allocatedToDID && (
                        <div className="alloc-success-badge">
                          ✓ Currently Allocated to: <code>{selectedThread.details.allocatedToDID}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Chat Messages Feed */}
              {selectedThread.messages
                ?.filter((msg) => {
                  const target = msg.recipientTarget || 'EVERYONE';
                  if (target === 'EVERYONE' || target === 'ALL') return true;
                  if (activeRole === 'ADMIN') return true;
                  if (msg.senderDID === activeDID) return true;
                  return target === activeRole;
                })
                .map((msg, idx) => {
                  const isMine = msg.senderDID === activeDID;
                return (
                  <div key={idx} className={`zoom-msg-row ${isMine ? 'mine' : 'other'}`}>
                    <div className="zoom-msg-bubble">
                      <div className="zoom-msg-header">
                        <span className="msg-author">
                          From: <strong>{msg.senderName || msg.senderDID.replace('did:sih26125:', '')}</strong>
                        </span>
                        <span className={`role-pill role-${(msg.senderRole || 'USER').toLowerCase()}`}>
                          {msg.senderRole}
                        </span>
                        <span className="recipient-tag font-mono">
                          (To: {msg.recipientTarget === 'ALL' ? 'EVERYONE' : (msg.recipientTarget || 'EVERYONE')})
                        </span>
                      </div>

                      <p className="msg-body">{msg.content}</p>

                      <div className="zoom-msg-footer mt-1 flex-between">
                        <span className="msg-sender-info">
                          Sent by <strong>{msg.senderRole}</strong> ({msg.senderName || msg.senderDID.replace('did:sih26125:', '')})
                        </span>
                        <span className="msg-time">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="zoom-empty-chat">
              <p>Welcome to the Organization Group Chat.</p>
              <p className="text-xs text-muted mt-1">Type a message below to post to everyone.</p>
            </div>
          )}
        </div>

        {/* Zoom-style Message Input Bar with "To:" Dropdown */}
        <form onSubmit={handleSendMessage} className="zoom-chat-input-bar">
          <div className="zoom-recipient-row">
            <span className="recipient-label">To:</span>
            <select
              className="zoom-recipient-select styled-select"
              value={recipientTarget}
              onChange={(e) => setRecipientTarget(e.target.value)}
            >
              <option value="EVERYONE">Everyone (Public Channel)</option>
              <option value="ADMIN">ADMIN (Administrators Only)</option>
              <option value="MANAGER">MANAGER (Operations Managers)</option>
              <option value="AUDITOR">AUDITOR (Audit &amp; Compliance)</option>
            </select>
          </div>

          <div className="zoom-input-row">
            <input
              type="text"
              className="zoom-input-field"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type message here..."
              required
            />
            <button type="submit" className="zoom-send-btn">
              Send ➢
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
