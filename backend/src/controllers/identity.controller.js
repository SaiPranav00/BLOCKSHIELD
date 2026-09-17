const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');
const { verifyDIDSignature, generateKeyPair } = require('../crypto/didCrypto');

exports.createDID = async (req, res) => {
    try {
        const { did, publicKey, role } = req.body;
        if (!did || !publicKey || !role) {
            return res.status(400).json({ success: false, error: 'Missing required parameters: did, publicKey, role' });
        }
        const result = await submitTransaction('CreateDID', did, publicKey, role);
        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAllDIDs = async (req, res) => {
    try {
        const result = await evaluateTransaction('GetAllDIDs');
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDID = async (req, res) => {
    try {
        const { did } = req.params;
        const result = await evaluateTransaction('GetDID', did);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(404).json({ success: false, error: err.message });
    }
};

exports.updateDID = async (req, res) => {
    try {
        const { did } = req.params;
        const { newPublicKey, newRole } = req.body;
        if (!newPublicKey && !newRole) {
            return res.status(400).json({ success: false, error: 'At least one of newPublicKey or newRole must be provided' });
        }
        const result = await submitTransaction('UpdateDID', did, newPublicKey || '', newRole || '');
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.revokeDID = async (req, res) => {
    try {
        const { did } = req.params;
        const result = await submitTransaction('RevokeDID', did);
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
