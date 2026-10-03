const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');

// Persistent in-memory messaging store with sample seed request
let messageThreads = [
  {
    id: 'thread-general',
    category: 'GENERAL_CHAT',
    status: 'ACTIVE',
    senderDID: 'did:sih26125:ADMIN001',
    senderName: 'System Admin',
    senderRole: 'ADMIN',
    targetRole: 'ALL',
    title: 'Public Channel (General)',
    details: {},
    messages: [
      {
        msgId: 'msg-000',
        senderDID: 'did:sih26125:ADMIN001',
        senderName: 'System Admin',
        senderRole: 'ADMIN',
        recipientTarget: 'EVERYONE',
        content: 'Welcome to the Fabric Network Group Channel. All members can broadcast and view messages here.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      }
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'thread-001',
    category: 'MINT_NFT', // 'REGISTER_DID', 'MINT_NFT', 'DELEGATE_ALLOCATE', 'ALLOCATION_REQ', 'GENERAL_CHAT'
    status: 'PENDING', // 'PENDING', 'ASSIGNED_TO_MANAGER', 'COMPLETED', 'REJECTED'
    senderDID: 'did:sih26125:CITIZEN_KUMAR',
    senderName: 'rajesh_kumar',
    senderRole: 'USER',
    targetRole: 'ADMIN',
    assignedManagerDID: '',
    title: 'Request: Mint B.Tech Degree Certificate',
    details: {
      requestedDID: 'did:sih26125:CITIZEN_KUMAR',
      requestedTokenId: 'NFT-DEGREE-2026',
      assetName: 'B.Tech Degree Certificate',
      assetType: 'CERTIFICATE',
      metadata: JSON.stringify({ issuer: 'IIT Madras', grade: 'Honours' }),
    },
    messages: [
      {
        msgId: 'msg-101',
        senderDID: 'did:sih26125:CITIZEN_KUMAR',
        senderName: 'rajesh_kumar',
        senderRole: 'USER',
        content: 'Hello Admin, please approve and mint my official B.Tech degree certificate on the Fabric ledger.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      }
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  }
];

// Helper: Filter messages by user role & identity (Strict Privacy Rules)
const filterThreadsForRole = (role, userDid) => {
  if (role === 'ADMIN') {
    // Admin sees ALL message threads and requests across the entire platform
    return messageThreads;
  }
  return messageThreads.filter(t => {
    // Public general chat channel is visible to everyone
    const isPublic = t.targetRole === 'ALL' || t.targetRole === 'EVERYONE' || t.category === 'GENERAL_CHAT';
    if (isPublic) return true;

    // Private requests/threads: visible ONLY to exact sender, target role, or assigned manager
    const isExactSender = userDid && t.senderDID === userDid;
    const isTargetRole = t.targetRole === role;
    const isAssignedManager = userDid && t.assignedManagerDID === userDid;

    return isExactSender || isTargetRole || isAssignedManager;
  });
};

// 1. Get Message Threads
exports.getMessages = async (req, res) => {
  try {
    const { role = 'USER', userDID = '' } = req.query;
    const threads = filterThreadsForRole(role, userDID);
    return res.status(200).json({ success: true, data: threads });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Create New Thread / Request
exports.createMessageThread = async (req, res) => {
  try {
    const {
      category = 'GENERAL_CHAT',
      senderDID,
      senderName,
      senderRole = 'USER',
      targetRole = 'ADMIN',
      title,
      content,
      details = {},
    } = req.body;

    if (!senderDID || !title || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields: senderDID, title, content' });
    }

    const newThread = {
      id: `thread-${Date.now()}`,
      category,
      status: 'PENDING',
      senderDID,
      senderName: senderName || senderDID,
      senderRole,
      targetRole,
      assignedManagerDID: details.assignedManagerDID || '',
      title,
      details,
      messages: [
        {
          msgId: `msg-${Date.now()}`,
          senderDID,
          senderName: senderName || senderDID,
          senderRole,
          content,
          timestamp: new Date().toISOString(),
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    messageThreads.unshift(newThread);
    return res.status(201).json({ success: true, data: newThread });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Post Reply to Thread
exports.replyToThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { senderDID, senderName, senderRole, recipientTarget = 'EVERYONE', content } = req.body;

    const thread = messageThreads.find(t => t.id === threadId);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Message thread not found' });
    }

    const replyMsg = {
      msgId: `msg-${Date.now()}`,
      senderDID,
      senderName: senderName || senderDID,
      senderRole,
      recipientTarget: recipientTarget || 'EVERYONE',
      content,
      timestamp: new Date().toISOString(),
    };

    thread.messages.push(replyMsg);
    thread.updatedAt = new Date().toISOString();

    return res.status(200).json({ success: true, data: thread });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Delegate Task (Admin -> Manager)
exports.delegateTaskToManager = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { managerDID, note, adminDID } = req.body;

    const thread = messageThreads.find(t => t.id === threadId);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Message thread not found' });
    }

    thread.assignedManagerDID = managerDID;
    thread.status = 'ASSIGNED_TO_MANAGER';
    thread.category = 'DELEGATE_ALLOCATE';
    thread.updatedAt = new Date().toISOString();

    thread.messages.push({
      msgId: `msg-${Date.now()}`,
      senderDID: adminDID || 'did:sih26125:ADMIN001',
      senderName: 'System Admin',
      senderRole: 'ADMIN',
      content: `[WORK DELEGATION] Assigned task to Manager (${managerDID}). Note: ${note || 'Please allocate asset as requested.'}`,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, data: thread });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Helper: System helper to dispatch new user signup task to Admin
exports.addSystemSignupTask = ({ did, username, requestedRole, userCategory = 'NON_DEFENCE', idProofType, idProofNumber, orgProof = {}, status = 'PENDING_APPROVAL' }) => {
  const isVerified = status === 'ACTIVE';
  const orgDetails = orgProof.serviceId ? `Service ID: ${orgProof.serviceId} | Dept: ${orgProof.department || 'N/A'}`
    : orgProof.employeeId ? `Employee ID: ${orgProof.employeeId} | Org Email: ${orgProof.companyEmail || 'N/A'}`
    : (orgProof.orgName ? `Affiliation: ${orgProof.orgName}` : 'Civilian / General');

  const newThread = {
    id: `thread-signup-${Date.now()}`,
    category: 'REGISTER_DID',
    status: isVerified ? 'COMPLETED' : 'PENDING',
    senderDID: did,
    senderName: username,
    senderRole: requestedRole || 'USER',
    targetRole: 'ADMIN',
    title: `Registration [${userCategory}]: ${username} (${requestedRole || 'USER'})`,
    details: {
      requestedDID: did,
      username,
      requestedRole: requestedRole || 'USER',
      userCategory,
      idProofType,
      idProofNumber,
      orgProof,
      publicKey: 'RSA-2048-PUBKEY',
    },
    messages: [
      {
        msgId: `msg-${Date.now()}`,
        senderDID: did,
        senderName: username,
        senderRole: requestedRole || 'USER',
        content: `New ${userCategory} account registration for '${username}' (${did}).\n• ID Proof: ${idProofType || 'Identity Proof'} (${idProofNumber || 'N/A'})\n• Organization Proof: ${orgDetails}\n• Verification Status: ${isVerified ? 'VERIFIED & ACTIVE ON FABRIC LEDGER' : 'PENDING ADMIN APPROVAL'}`,
        timestamp: new Date().toISOString(),
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  messageThreads.unshift(newThread);
  return newThread;
};

// 5. Execute Actionable Request (Trigger Fabric On-Chain Transaction directly from Chat Thread)
exports.executeThreadAction = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { actorDID, actionType, parameters } = req.body;

    const thread = messageThreads.find(t => t.id === threadId);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Message thread not found' });
    }

    let txResult = null;

    if (actionType === 'REGISTER_DID' || actionType === 'USER_SIGNUP_REQ') {
      const { did, requestedDID, publicKey, role, requestedRole } = parameters || thread.details || {};
      const targetDid = did || requestedDID || thread.senderDID;
      const targetRole = role || requestedRole || thread.senderRole || 'USER';
      txResult = await submitTransaction('CreateDID', targetDid, publicKey || 'RSA-2048-PUBKEY', targetRole);

      // Activate credential in userStore
      try {
        const { getUserCredentials } = require('./access.controller');
        const creds = getUserCredentials();
        const userCred = creds.get(targetDid);
        if (userCred) {
          userCred.status = 'ACTIVE';
        }
      } catch (e) {
        console.error('Credential sync error:', e);
      }
    } else if (actionType === 'MINT_NFT') {
      const { adminDID, tokenId, assetName, assetType, metadata } = parameters || thread.details || {};
      const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '{}');
      const targetTokenId = tokenId || `NFT-${Date.now().toString().slice(-4)}`;
      txResult = await submitTransaction('MintNFT', actorDID || adminDID || 'did:sih26125:ADMIN001', targetTokenId, assetName || 'Digital Asset', assetType || 'PROPERTY', metaStr);
    } else if (actionType === 'ALLOCATE_NFT') {
      const { tokenId, ownerDID } = parameters || thread.details || {};
      const targetOwner = ownerDID || thread.senderDID;
      txResult = await submitTransaction('AllocateNFT', actorDID, tokenId, targetOwner);
    } else if (actionType === 'RESOLVE') {
      txResult = { message: 'Request resolved' };
    } else {
      return res.status(400).json({ success: false, error: `Unsupported actionType: ${actionType}` });
    }

    thread.status = 'COMPLETED';
    thread.updatedAt = new Date().toISOString();
    thread.messages.push({
      msgId: `msg-${Date.now()}`,
      senderDID: actorDID || 'did:sih26125:ADMIN001',
      senderName: 'System Bot',
      senderRole: 'SYSTEM',
      content: `✓ COMPLETED & EXECUTED ON FABRIC LEDGER: Action '${actionType}' verified on-chain!`,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, data: thread, txResult });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
