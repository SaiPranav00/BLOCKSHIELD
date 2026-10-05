const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');
const { verifyDIDSignature, generateKeyPair } = require('../crypto/didCrypto');
const User = require('../models/User');

exports.createDID = async (req, res) => {
    try {
        const { did, publicKey, role, department = 'R&D' } = req.body;
        if (!did || !publicKey || !role) {
            return res.status(400).json({ success: false, error: 'Missing required parameters: did, publicKey, role' });
        }
        const result = await submitTransaction('CreateDID', did, publicKey, role, department);

        // Under BLOCKSHIELD security governance, Admin creates accounts for all roles.
        // Persist new account in MongoDB as ACTIVE so User/Manager/Auditor can immediately log in.
        try {
            const shortName = did.replace('did:sih26125:', '');
            await User.findOneAndUpdate(
                { did },
                {
                    did,
                    username: shortName,
                    password: req.body.password || 'password123',
                    role: (role || 'USER').toUpperCase(),
                    status: 'ACTIVE',
                    name: shortName,
                    department: department || 'R&D',
                    userCategory: req.body.userCategory || 'DEFENCE',
                    idProofType: req.body.idProofType || 'GOVERNMENT_ID',
                    idProofNumber: req.body.idProofNumber || 'ADMIN_VERIFIED',
                    orgProof: req.body.orgProof || { department, verifiedBy: 'ADMIN001' },
                    publicKey: publicKey || '',
                },
                { upsert: true, new: true }
            );
            console.log(`[Admin Created Account] Successfully provisioned ${did} in MongoDB & Fabric as ${role}`);
        } catch (e) {
            console.error('[CreateDID MongoDB Sync Error]', e.message);
        }

        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAllDIDs = async (req, res) => {
    try {
        let fabricDids = [];
        try {
            const result = await evaluateTransaction('GetAllDIDs');
            fabricDids = Array.isArray(result) ? result : (typeof result === 'string' ? JSON.parse(result) : []);
        } catch (err) {
            console.warn('[GetAllDIDs Fabric Fallback]:', err.message);
        }

        // Merge with MongoDB Users for complete, un-hardcoded real identity records
        const mongoUsers = await User.find({}).lean();
        const didMap = new Map();

        fabricDids.forEach(d => {
            if (d && d.did) didMap.set(d.did, d);
        });

        mongoUsers.forEach(u => {
            const existing = didMap.get(u.did);
            if (existing) {
                didMap.set(u.did, {
                    ...existing,
                    userCategory: u.userCategory || 'DEFENCE',
                    department: u.department || existing.department || 'R&D',
                    idProofType: u.idProofType,
                    idProofNumber: u.idProofNumber,
                    orgProof: u.orgProof,
                    name: u.name,
                    status: u.status || existing.status || 'ACTIVE'
                });
            } else {
                didMap.set(u.did, {
                    docType: 'identity',
                    did: u.did,
                    role: u.role,
                    status: u.status,
                    department: u.department || 'R&D',
                    userCategory: u.userCategory || 'DEFENCE',
                    idProofType: u.idProofType,
                    idProofNumber: u.idProofNumber,
                    orgProof: u.orgProof,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt
                });
            }
        });

        const combined = Array.from(didMap.values());
        return res.status(200).json({ success: true, data: combined });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDID = async (req, res) => {
    try {
        const { did } = req.params;
        try {
            const result = await evaluateTransaction('GetDID', did);
            return res.status(200).json({ success: true, data: result });
        } catch {
            const mongoUser = await User.findOne({ did });
            if (mongoUser) {
                return res.status(200).json({ success: true, data: mongoUser });
            }
            return res.status(404).json({ success: false, error: 'DID record not found' });
        }
    } catch (err) {
        return res.status(404).json({ success: false, error: err.message });
    }
};

exports.updateDID = async (req, res) => {
    try {
        const { did } = req.params;
        const { newPublicKey, newRole, newDepartment } = req.body;
        if (!newPublicKey && !newRole && !newDepartment) {
            return res.status(400).json({ success: false, error: 'At least one of newPublicKey, newRole, or newDepartment must be provided' });
        }
        const result = await submitTransaction('UpdateDID', did, newPublicKey || '', newRole || '', newDepartment || '');
        
        // Sync with MongoDB
        const updateObj = {};
        if (newPublicKey) updateObj.publicKey = newPublicKey;
        if (newRole) updateObj.role = newRole.toUpperCase();
        if (newDepartment) updateObj.department = newDepartment;
        await User.findOneAndUpdate({ did }, updateObj);

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.revokeDID = async (req, res) => {
    try {
        const { did } = req.params;
        const result = await submitTransaction('RevokeDID', did);

        // Mark REVOKED in MongoDB
        await User.findOneAndUpdate({ did }, { status: 'REVOKED' });

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.verifyDID = async (req, res) => {
    try {
        const { did, message, signature, publicKey } = req.body;
        if (message && signature) {
            const cryptoRes = await verifyDIDSignature(did, message, signature, publicKey);
            return res.status(200).json(cryptoRes);
        }
        const result = await evaluateTransaction('VerifyDID', did);
        return res.status(200).json({ success: true, data: typeof result === 'string' ? JSON.parse(result) : result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.generateKeyPair = async (req, res) => {
    try {
        const keypair = generateKeyPair();
        return res.status(200).json({ success: true, ...keypair });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
