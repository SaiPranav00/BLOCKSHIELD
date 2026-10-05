const { evaluateTransaction } = require('../fabric/gateway');
const { verifyDIDSignature } = require('../crypto/didCrypto');
const User = require('../models/User');

exports.verifyAuth = async (req, res) => {
    try {
        const { did, message, signature, publicKey } = req.body;
        if (!did || !message || !signature) {
            return res.status(400).json({ success: false, error: 'Missing required fields: did, message, signature' });
        }
        const verification = await verifyDIDSignature(did, message, signature, publicKey);
        if (!verification.valid) {
            return res.status(401).json({ success: false, ...verification });
        }
        const didRecord = await evaluateTransaction('GetDID', did);
        return res.status(200).json({
            authenticated: true,
            did,
            role: didRecord.role,
            status: didRecord.status,
            publicKey: didRecord.publicKey
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.checkAccess = async (req, res) => {
    try {
        const { actorDID, allowedRoles } = req.body;
        if (!actorDID || !allowedRoles || !Array.isArray(allowedRoles)) {
            return res.status(400).json({ success: false, error: 'Missing required fields: actorDID, allowedRoles (array)' });
        }
        const result = await evaluateTransaction('CheckAccess', actorDID, allowedRoles);
        return res.status(200).json({ allowed: true, identity: result });
    } catch (err) {
        return res.status(403).json({ allowed: false, error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { identity, password, role } = req.body;
        if (!identity || !password) {
            return res.status(400).json({ success: false, error: 'Please enter DID/Username and password' });
        }

        const rawIdent = identity.trim();
        let cleanDid = rawIdent;
        if (!cleanDid.startsWith('did:sih26125:')) {
            const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
            cleanDid = `did:sih26125:${cleanSuffix}`;
        }
        const shortName = cleanDid.replace('did:sih26125:', '');

        // Step 1: Query exact DID or exact username first
        let userDoc = await User.findOne({
            $or: [
                { did: cleanDid },
                { username: shortName },
                { username: rawIdent }
            ]
        });

        // Step 2: Only if no exact match exists, check demo aliases
        if (!userDoc) {
            const stripped = rawIdent.replace(/[-\s_]/g, '').toUpperCase();
            let aliasTarget = null;
            if (stripped === 'ADMIN' || stripped === 'ADMIN001' || stripped === 'ADMIN1') aliasTarget = 'ADMIN001';
            else if (stripped === 'MANAGER' || stripped === 'MANAGER001' || stripped === 'MANAGER002' || stripped === 'MANAGER1') aliasTarget = 'MANAGER001';
            else if (stripped === 'AUDITOR' || stripped === 'AUDITOR001' || stripped === 'AUDITOR1') aliasTarget = 'AUDITOR001';
            else if (stripped === 'USER' || stripped === 'USER001' || stripped === 'USER014' || stripped === 'USER1') aliasTarget = 'USER001';

            if (aliasTarget) {
                userDoc = await User.findOne({
                    $or: [
                        { username: { $regex: new RegExp(`^${aliasTarget}$`, 'i') } },
                        { did: { $regex: new RegExp(`^did:sih26125:${aliasTarget}$`, 'i') } }
                    ]
                });
            }
        }

        if (userDoc) {
            cleanDid = userDoc.did;

            if (userDoc.password !== password) {
                return res.status(401).json({ success: false, error: 'Invalid credentials password' });
            }

            // Check if user is still pending Admin approval
            if (userDoc.status === 'PENDING_APPROVAL') {
                return res.status(403).json({
                    success: false,
                    authenticated: false,
                    error: `Account request for ${cleanDid} is PENDING Administrator approval. In accordance with BLOCKSHIELD enterprise governance, only the System Administrator is authorized to create accounts and issue DIDs for Users, Managers, and Auditors.`
                });
            }

            if (userDoc.status === 'REVOKED') {
                return res.status(403).json({ success: false, error: `Identity ${cleanDid} is REVOKED by Administrator policy.` });
            }
        }

        // Verify with Fabric ledger
        let ledgerRole = role || (userDoc ? userDoc.role : 'USER');
        try {
            const didRecord = await evaluateTransaction('GetDID', cleanDid);
            if (didRecord && didRecord.status === 'REVOKED') {
                if (userDoc) {
                    userDoc.status = 'REVOKED';
                    await userDoc.save();
                }
                return res.status(403).json({ success: false, error: `Identity ${cleanDid} is REVOKED on ledger` });
            }
            if (didRecord && didRecord.role) {
                ledgerRole = didRecord.role;
            }
        } catch {
            if (!userDoc) {
                return res.status(403).json({
                    success: false,
                    error: `Identity ${cleanDid} is not registered. Only the Administrator can create accounts for Users, Managers, and Auditors.`
                });
            }
        }

        return res.status(200).json({
            success: true,
            authenticated: true,
            did: userDoc ? userDoc.did : cleanDid,
            role: ledgerRole,
            username: userDoc ? userDoc.username : shortName,
            name: userDoc ? userDoc.name : shortName,
            token: `token_${Date.now()}`
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.registerUser = async (req, res) => {
    try {
        const {
            username,
            password,
            role = 'USER',
            userCategory = 'NON_DEFENCE', // 'DEFENCE' | 'SOFTWARE' | 'NON_DEFENCE'
            idProofType,
            idProofNumber,
            orgProof = {}
        } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }

        let targetRole = (role || 'USER').toUpperCase();
        if (targetRole === 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'System policy error: Only one primary Administrator (did:sih26125:ADMIN001) is allowed. Additional accounts cannot be registered with ADMIN role.'
            });
        }

        let rawInput = username.trim();
        let cleanDid = rawInput;
        if (!cleanDid.startsWith('did:sih26125:')) {
            const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
            cleanDid = `did:sih26125:${cleanSuffix}`;
        }
        const shortName = cleanDid.replace('did:sih26125:', '');

        const RESERVED_USERNAMES = [
            'ADMIN', 'ADMIN001', 'ADMIN1',
            'MANAGER', 'MANAGER001', 'MANAGER1',
            'AUDITOR', 'AUDITOR001', 'AUDITOR1',
            'USER', 'USER001', 'USER1',
            'N123456'
        ];

        if (RESERVED_USERNAMES.includes(shortName.toUpperCase()) || RESERVED_USERNAMES.includes(rawInput.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: `Username '${shortName}' is a reserved system identity. Please choose a unique personal or organizational username.`
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { did: cleanDid },
                { username: shortName }
            ]
        });

        if (existingUser) {
            if (existingUser.status === 'PENDING_APPROVAL') {
                return res.status(400).json({
                    success: false,
                    error: `An account registration for '${shortName}' (${cleanDid}) has already been submitted and is currently awaiting manual Administrator approval.`
                });
            }
            if (existingUser.status === 'ACTIVE') {
                return res.status(400).json({
                    success: false,
                    error: `Account '${cleanDid}' is already registered and active. Please proceed to sign in.`
                });
            }
        }

        // Enterprise governance: Admin is sole authority creating accounts
        const accountStatus = 'PENDING_APPROVAL';

        // Persist directly to MongoDB
        await User.findOneAndUpdate(
            { did: cleanDid },
            {
                did: cleanDid,
                username: shortName,
                password,
                role: targetRole,
                status: accountStatus,
                name: username,
                userCategory,
                idProofType,
                idProofNumber,
                orgProof,
            },
            { upsert: true, new: true }
        );

        // Dispatch registration task to Admin channel in MongoDB
        const { addSystemSignupTask } = require('./messages.controller');
        await addSystemSignupTask({
            did: cleanDid,
            username: shortName,
            requestedRole: targetRole,
            userCategory,
            idProofType,
            idProofNumber,
            orgProof,
            status: accountStatus
        });

        return res.status(201).json({
            success: true,
            verified: false,
            did: cleanDid,
            role: targetRole,
            status: accountStatus,
            userCategory,
            username: shortName,
            message: `Access application submitted! In accordance with BLOCKSHIELD enterprise governance, only the System Administrator is authorized to create accounts and issue DIDs for Users, Managers, and Auditors. Your application is queued for Admin review.`
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
