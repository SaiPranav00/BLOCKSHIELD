const { evaluateTransaction } = require('../fabric/gateway');
const { verifyDIDSignature } = require('../crypto/didCrypto');

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

// Simple User & Role Credential Store (Single System Admin: did:sih26125:ADMIN001)
const userCredentials = new Map([
    ['did:sih26125:ADMIN001', { password: 'password123', role: 'ADMIN', status: 'ACTIVE', name: 'Admin System Account' }],
    ['did:sih26125:MANAGER001', { password: 'password123', role: 'MANAGER', status: 'ACTIVE', name: 'Manager System Account' }],
    ['did:sih26125:AUDITOR001', { password: 'password123', role: 'AUDITOR', status: 'ACTIVE', name: 'Auditor System Account' }],
    ['did:sih26125:USER001', { password: 'password123', role: 'USER', status: 'ACTIVE', name: 'Standard User Account' }],
    ['did:sih26125:CITIZEN_KUMAR', { password: 'password123', role: 'USER', status: 'ACTIVE', name: 'Standard User Account' }],
]);

exports.getUserCredentials = () => userCredentials;

exports.login = async (req, res) => {
    try {
        const { identity, password, role } = req.body;
        if (!identity || !password) {
            return res.status(400).json({ success: false, error: 'Please enter DID/Username and password' });
        }

        let cleanDid = identity.trim();
        if (!cleanDid.startsWith('did:sih26125:')) {
            const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
            cleanDid = `did:sih26125:${cleanSuffix}`;
        }

        const cred = userCredentials.get(cleanDid);
        if (cred && cred.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid credentials password' });
        }

        // Check if user is still pending Admin approval
        if (cred && cred.status === 'PENDING_APPROVAL') {
            return res.status(403).json({
                success: false,
                authenticated: false,
                error: `Registration request for ${cleanDid} is PENDING Admin approval. You will gain access once Admin accepts your request.`
            });
        }

        // Check Fabric ledger first for DID status & role
        let ledgerRole = role || (cred ? cred.role : 'USER');
        try {
            const didRecord = await evaluateTransaction('GetDID', cleanDid);
            if (didRecord && didRecord.status === 'REVOKED') {
                return res.status(403).json({ success: false, error: `Identity ${cleanDid} is REVOKED on ledger` });
            }
            if (didRecord && didRecord.role) {
                ledgerRole = didRecord.role;
            }
        } catch {
            // Check if identity exists in credentials
            if (!cred) {
                return res.status(403).json({
                    success: false,
                    error: `Identity ${cleanDid} is not registered or approved by Admin.`
                });
            }
        }

        return res.status(200).json({
            success: true,
            authenticated: true,
            did: cleanDid,
            role: ledgerRole,
            username: cleanDid.replace('did:sih26125:', ''),
            token: `token_${Date.now()}`
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.registerUser = async (req, res) => {
    try {
        const { username, password, role = 'USER' } = req.body;
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

        // Register user account in PENDING_APPROVAL status
        userCredentials.set(cleanDid, { password, role: targetRole, status: 'PENDING_APPROVAL', name: username });

        // Dispatch automatic USER_SIGNUP_REQ task to Admin channel
        const { addSystemSignupTask } = require('./messages.controller');
        addSystemSignupTask({
            did: cleanDid,
            username: cleanDid.replace('did:sih26125:', ''),
            requestedRole: role,
        });

        return res.status(201).json({
            success: true,
            did: cleanDid,
            role,
            status: 'PENDING_APPROVAL',
            username: cleanDid.replace('did:sih26125:', ''),
            message: 'Signup request submitted to Admin! Dashboard access will be unlocked upon Admin approval.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

