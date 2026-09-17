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

// Simple User & Role Credential Store
const userCredentials = new Map([
    ['did:sih26125:ADMIN001', { password: 'password123', role: 'ADMIN', name: 'Admin System Account' }],
    ['did:sih26125:ADMIN', { password: 'password123', role: 'ADMIN', name: 'Admin System Account' }],
    ['did:sih26125:MANAGER001', { password: 'password123', role: 'MANAGER', name: 'Manager System Account' }],
    ['did:sih26125:MGR001', { password: 'password123', role: 'MANAGER', name: 'Manager System Account' }],
    ['did:sih26125:AUDITOR001', { password: 'password123', role: 'AUDITOR', name: 'Auditor System Account' }],
    ['did:sih26125:AUDIT001', { password: 'password123', role: 'AUDITOR', name: 'Auditor System Account' }],
    ['did:sih26125:USER001', { password: 'password123', role: 'USER', name: 'Standard User Account' }],
    ['did:sih26125:N123456', { password: 'password123', role: 'USER', name: 'Standard User Account' }],
]);

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

        // 1. Check Fabric ledger first for DID status & role
        let ledgerRole = role || 'USER';
        try {
            const didRecord = await evaluateTransaction('GetDID', cleanDid);
            if (didRecord && didRecord.status === 'REVOKED') {
                return res.status(403).json({ success: false, error: `Identity ${cleanDid} is REVOKED on ledger` });
            }
            if (didRecord && didRecord.role) {
                ledgerRole = didRecord.role;
            }
        } catch {
            // DID might be pending registration
        }

        const cred = userCredentials.get(cleanDid);
        if (cred && cred.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid credentials password' });
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

        let cleanDid = username.trim();
        if (!cleanDid.startsWith('did:sih26125:')) {
            const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
            cleanDid = `did:sih26125:${cleanSuffix}`;
        }

        userCredentials.set(cleanDid, { password, role, name: username });

        return res.status(201).json({
            success: true,
            did: cleanDid,
            role,
            username: cleanDid.replace('did:sih26125:', ''),
            message: 'User registered successfully. Proceed with login or DID request.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

