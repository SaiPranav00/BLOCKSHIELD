const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');

// Persistent in-memory messaging store with sample seed request
let messageThreads = [
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

// Helper: Filter messages by user role & identity
const filterThreadsForRole = (role, userDid) => {
  if (role === 'ADMIN') {
    // Admin sees ALL message threads across the entire platform
    return messageThreads;
  }
  if (role === 'MANAGER') {
    // Manager sees threads assigned to managers, tasks delegated to them, or sent by them
    return messageThreads.filter(
      t => t.targetRole === 'MANAGER' || 
           t.assignedManagerDID === userDid || 
           t.senderRole === 'MANAGER' || 
           t.senderDID === userDid ||
           t.category === 'DELEGATE_ALLOCATE' ||
           t.category === 'ALLOCATION_REQ'
    );
  }
  // User sees only their own message threads
  return messageThreads.filter(t => t.senderDID === userDid || t.details?.requestedDID === userDid);
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
    const { senderDID, senderName, senderRole, content } = req.body;

    const thread = messageThreads.find(t => t.id === threadId);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Message thread not found' });
    }

    const replyMsg = {
      msgId: `msg-${Date.now()}`,
      senderDID,
      senderName: senderName || senderDID,
      senderRole,
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

    if (actionType === 'REGISTER_DID') {
      const { did, publicKey, role } = parameters || thread.details;
      txResult = await submitTransaction('CreateDID', did, publicKey || 'RSA-2048-PUBKEY', role || 'USER');
    } else if (actionType === 'MINT_NFT') {
      const { adminDID, tokenId, assetName, assetType, metadata } = parameters || thread.details;
      const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '{}');
      txResult = await submitTransaction('MintNFT', actorDID || adminDID || 'did:sih26125:ADMIN001', tokenId, assetName, assetType, metaStr);
    } else if (actionType === 'ALLOCATE_NFT') {
      const { tokenId, ownerDID } = parameters || thread.details;
      txResult = await submitTransaction('AllocateNFT', actorDID, tokenId, ownerDID);
    } else if (actionType === 'RESOLVE') {
      txResult = { message: 'Request resolved' };
    } else {
      return res.status(400).json({ success: false, error: `Unsupported actionType: ${actionType}` });
    }

    thread.status = 'COMPLETED';
    thread.updatedAt = new Date().toISOString();
    thread.messages.push({
      msgId: `msg-${Date.now()}`,
      senderDID: actorDID,
      senderName: 'System Bot',
      senderRole: 'SYSTEM',
      content: `[ACTION EXECUTED ON LEDGER] Action '${actionType}' completed successfully!`,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, data: thread, txResult });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
