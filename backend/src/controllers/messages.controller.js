const { submitTransaction } = require('../fabric/gateway');
const MessageThread = require('../models/MessageThread');
const User = require('../models/User');

// 1. Get Message Threads from MongoDB
exports.getMessages = async (req, res) => {
  try {
    const { role = 'USER', userDID = '' } = req.query;
    
    let query = {};
    if (role !== 'ADMIN') {
      query = {
        $or: [
          { targetRole: 'ALL' },
          { targetRole: 'EVERYONE' },
          { category: 'GENERAL_CHAT' },
          { senderDID: userDID },
          { targetRole: role },
          { assignedManagerDID: userDID }
        ]
      };
    }

    const threads = await MessageThread.find(query).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, data: threads });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Create New Thread / Request in MongoDB
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

    const threadId = `thread-${Date.now()}`;
    const newThread = new MessageThread({
      id: threadId,
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
          recipientTarget: 'EVERYONE',
          content,
          timestamp: new Date().toISOString(),
        }
      ]
    });

    await newThread.save();
    return res.status(201).json({ success: true, data: newThread });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Post Reply to Thread in MongoDB
exports.replyToThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { senderDID, senderName, senderRole, recipientTarget = 'EVERYONE', content } = req.body;

    const thread = await MessageThread.findOne({ id: threadId });
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
    await thread.save();

    return res.status(200).json({ success: true, data: thread });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Delegate Task (Admin -> Manager) in MongoDB
exports.delegateTaskToManager = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { managerDID, note, adminDID } = req.body;

    const thread = await MessageThread.findOne({ id: threadId });
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Message thread not found' });
    }

    thread.assignedManagerDID = managerDID;
    thread.status = 'ASSIGNED_TO_MANAGER';
    thread.category = 'DELEGATE_ALLOCATE';

    thread.messages.push({
      msgId: `msg-${Date.now()}`,
      senderDID: adminDID || 'did:sih26125:ADMIN001',
      senderName: 'System Admin',
      senderRole: 'ADMIN',
      recipientTarget: 'EVERYONE',
      content: `[WORK DELEGATION] Assigned task to Manager (${managerDID}). Note: ${note || 'Please allocate asset as requested.'}`,
      timestamp: new Date().toISOString(),
    });

    await thread.save();
    return res.status(200).json({ success: true, data: thread });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Helper: Dispatch new user signup task to Admin channel in MongoDB
exports.addSystemSignupTask = async ({ did, username, requestedRole, userCategory = 'NON_DEFENCE', idProofType, idProofNumber, orgProof = {}, status = 'PENDING_APPROVAL' }) => {
  try {
    const isVerified = status === 'ACTIVE';
    const orgDetails = orgProof.serviceId ? `Service ID: ${orgProof.serviceId} | Dept: ${orgProof.department || 'N/A'}`
      : orgProof.employeeId ? `Employee ID: ${orgProof.employeeId} | Org Email: ${orgProof.companyEmail || 'N/A'}`
      : (orgProof.orgName ? `Affiliation: ${orgProof.orgName}` : 'Civilian / General');

    const threadId = `thread-signup-${Date.now()}`;
    const newThread = new MessageThread({
      id: threadId,
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
          recipientTarget: 'EVERYONE',
          content: `New ${userCategory} account registration for '${username}' (${did}).\n• ID Proof: ${idProofType || 'Identity Proof'} (${idProofNumber || 'N/A'})\n• Organization Proof: ${orgDetails}\n• Verification Status: ${isVerified ? 'VERIFIED & ACTIVE ON FABRIC LEDGER' : 'PENDING ADMIN APPROVAL'}`,
          timestamp: new Date().toISOString(),
        }
      ]
    });

    await newThread.save();
    return newThread;
  } catch (e) {
    console.error('[addSystemSignupTask Error]:', e.message);
  }
};

// 5. Execute Actionable Request on Fabric & Persist in MongoDB
exports.executeThreadAction = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { actorDID, actionType, parameters } = req.body;

    const thread = await MessageThread.findOne({ id: threadId });
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Message thread not found' });
    }

    let txResult = null;

    if (actionType === 'REGISTER_DID' || actionType === 'USER_SIGNUP_REQ') {
      const { did, requestedDID, publicKey, role, requestedRole } = parameters || thread.details || {};
      const targetDid = did || requestedDID || thread.senderDID;
      const targetRole = role || requestedRole || thread.senderRole || 'USER';
      txResult = await submitTransaction('CreateDID', targetDid, publicKey || 'RSA-2048-PUBKEY', targetRole);

      // Activate credential in MongoDB User collection
      await User.findOneAndUpdate({ did: targetDid }, { status: 'ACTIVE', role: targetRole });
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
    thread.messages.push({
      msgId: `msg-${Date.now()}`,
      senderDID: actorDID || 'did:sih26125:ADMIN001',
      senderName: 'System Bot',
      senderRole: 'SYSTEM',
      recipientTarget: 'EVERYONE',
      content: `✓ COMPLETED & EXECUTED ON FABRIC LEDGER: Action '${actionType}' verified on-chain!`,
      timestamp: new Date().toISOString(),
    });

    await thread.save();
    return res.status(200).json({ success: true, data: thread, txResult });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
