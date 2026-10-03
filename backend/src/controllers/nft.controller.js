const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');
const Asset = require('../models/Asset');

exports.mintNFT = async (req, res) => {
    try {
        const { adminDID, tokenId, assetName, assetType, metadata, ownerDID, targetOwnerDID, department = 'R&D', location = 'HQ' } = req.body;
        if (!adminDID || !tokenId || !assetName || !assetType) {
            return res.status(400).json({ success: false, error: 'Missing required fields: adminDID, tokenId, assetName, assetType' });
        }
        const initialOwner = ownerDID || targetOwnerDID || '';
        const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '{}');

        // Submit to Fabric
        const result = await submitTransaction('MintNFT', adminDID, tokenId, assetName, assetType, metaStr, initialOwner);

        // Persist to MongoDB Asset
        await Asset.findOneAndUpdate(
            { tokenId },
            {
                tokenId,
                assetName,
                assetType,
                legalOwner: 'BEL',
                custodian: initialOwner,
                ownerDID: initialOwner,
                department,
                location,
                metadata: metaStr,
                creatorDID: adminDID,
                status: 'ACTIVE'
            },
            { upsert: true, new: true }
        );

        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.getAllNFTs = async (req, res) => {
    try {
        let fabricNfts = [];
        try {
            const result = await evaluateTransaction('GetAllNFTs');
            fabricNfts = Array.isArray(result) ? result : (typeof result === 'string' ? JSON.parse(result) : []);
        } catch (err) {
            console.warn('[GetAllNFTs Fabric Fallback]:', err.message);
        }

        const mongoAssets = await Asset.find({}).lean();
        const assetMap = new Map();

        fabricNfts.forEach(a => {
            if (a && a.tokenId) assetMap.set(a.tokenId, a);
        });

        mongoAssets.forEach(a => {
            const existing = assetMap.get(a.tokenId);
            if (existing) {
                assetMap.set(a.tokenId, {
                    ...existing,
                    assetName: existing.assetName || a.assetName,
                    custodian: existing.custodian || existing.ownerDID || a.custodian || a.ownerDID,
                    ownerDID: existing.ownerDID || a.ownerDID,
                    department: a.department || existing.department || 'R&D',
                    location: a.location || existing.location || 'HQ',
                    status: existing.status || a.status || 'ACTIVE'
                });
            } else {
                assetMap.set(a.tokenId, {
                    docType: 'nft',
                    tokenId: a.tokenId,
                    assetName: a.assetName,
                    assetType: a.assetType,
                    legalOwner: a.legalOwner,
                    custodian: a.custodian,
                    ownerDID: a.ownerDID,
                    department: a.department,
                    location: a.location,
                    metadata: a.metadata,
                    status: a.status,
                    createdAt: a.createdAt,
                    updatedAt: a.updatedAt
                });
            }
        });

        const combined = Array.from(assetMap.values());
        return res.status(200).json({ success: true, data: combined });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        try {
            const result = await evaluateTransaction('GetNFT', tokenId);
            return res.status(200).json({ success: true, data: result });
        } catch {
            const assetDoc = await Asset.findOne({ tokenId });
            if (assetDoc) {
                return res.status(200).json({ success: true, data: assetDoc });
            }
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
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

        // Update in MongoDB
        await Asset.findOneAndUpdate(
            { tokenId },
            {
                ownerDID,
                custodian: ownerDID,
                status: 'ACTIVE'
            },
            { upsert: true }
        );

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

        await Asset.findOneAndUpdate(
            { tokenId },
            {
                ownerDID: newOwnerDID,
                custodian: newOwnerDID,
                status: 'ACTIVE'
            }
        );

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

        await Asset.findOneAndUpdate(
            { tokenId },
            { status: 'REVOKED' }
        );

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
        let fabricAssets = [];
        try {
            const result = await evaluateTransaction('GetAssetsByOwnerDID', did);
            fabricAssets = Array.isArray(result) ? result : (typeof result === 'string' ? JSON.parse(result) : []);
        } catch (err) {
            console.warn('[GetAssetsByOwnerDID Fabric Fallback]:', err.message);
        }

        const mongoAssets = await Asset.find({
            $or: [{ ownerDID: did }, { custodian: did }]
        }).lean();

        const assetMap = new Map();
        fabricAssets.forEach(a => {
            if (a && a.tokenId) assetMap.set(a.tokenId, a);
        });
        mongoAssets.forEach(a => {
            if (!assetMap.has(a.tokenId)) {
                assetMap.set(a.tokenId, a);
            }
        });

        const combined = Array.from(assetMap.values());
        return res.status(200).json({ success: true, data: combined });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.verifyNFT = async (req, res) => {
    try {
        const { tokenId } = req.params;
        const result = await evaluateTransaction('VerifyNFT', tokenId);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(404).json({ success: false, error: err.message });
    }
};
