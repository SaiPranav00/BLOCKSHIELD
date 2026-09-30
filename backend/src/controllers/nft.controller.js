const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');

exports.mintNFT = async (req, res) => {
    try {
        const { adminDID, tokenId, assetName, assetType, metadata, ownerDID, targetOwnerDID } = req.body;
        if (!adminDID || !tokenId || !assetName || !assetType) {
            return res.status(400).json({ success: false, error: 'Missing required fields: adminDID, tokenId, assetName, assetType' });
        }
        const initialOwner = ownerDID || targetOwnerDID || '';
        const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '{}');
        const result = await submitTransaction('MintNFT', adminDID, tokenId, assetName, assetType, metaStr, initialOwner);
        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.getAllNFTs = async (req, res) => {
    try {
        const result = await evaluateTransaction('GetAllNFTs');
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const result = await evaluateTransaction('GetNFT', tokenId);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(404).json({ success: false, error: err.message });
    }
};

exports.allocateNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { actorDID, ownerDID } = req.body;
        if (!actorDID || !ownerDID) {
            return res.status(400).json({ success: false, error: 'Missing required parameters: actorDID, ownerDID' });
        }
        const result = await submitTransaction('AllocateNFT', actorDID, tokenId, ownerDID);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.transferNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { actorDID, newOwnerDID } = req.body;
        if (!actorDID || !newOwnerDID) {
            return res.status(400).json({ success: false, error: 'Missing required parameters: actorDID, newOwnerDID' });
        }
        const result = await submitTransaction('TransferNFT', actorDID, tokenId, newOwnerDID);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.revokeNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { adminDID } = req.body;
        if (!adminDID) {
            return res.status(400).json({ success: false, error: 'Missing required parameter: adminDID' });
        }
        const result = await submitTransaction('RevokeNFT', adminDID, tokenId);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.getNFTHistory = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const result = await evaluateTransaction('GetNFTHistory', tokenId);
        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
        return res.status(200).json({ success: true, data: parsed });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAssetsByOwnerDID = async (req, res) => {
    try {
        const { did } = req.params;
        const result = await evaluateTransaction('GetAssetsByOwnerDID', did);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.verifyNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const result = await evaluateTransaction('VerifyNFT', tokenId);
        const parsed = typeof result === 'string' ? JSON.parse(result) : result;
        return res.status(200).json({ success: true, data: parsed });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
