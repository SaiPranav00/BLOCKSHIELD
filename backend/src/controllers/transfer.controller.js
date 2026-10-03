const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');
const TransferRequest = require('../models/TransferRequest');
const Asset = require('../models/Asset');

exports.createTransferRequest = async (req, res) => {
    try {
        const requestedByDID = req.body.requestedByDID || req.body.requesterDID || req.body.fromDID;
        const toDID = req.body.toDID || req.body.targetCustodian || req.body.toCustodian;
        const tokenId = req.body.tokenId;
        const reason = req.body.reason || '';

        if (!requestedByDID || !tokenId || !toDID) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: requestedByDID, tokenId, toDID'
            });
        }

        const requestId = `REQ-${Date.now().toString().slice(-6)}`;

        // Submit to Fabric
        let fabricRes = null;
        try {
            fabricRes = await submitTransaction('CreateTransferRequest', requestedByDID, tokenId, toDID, reason);
        } catch (e) {
            console.warn('[CreateTransferRequest Fabric notice]:', e.message);
        }

        const finalReqId = (fabricRes && fabricRes.requestId) || requestId;

        // Persist to MongoDB
        const transferDoc = new TransferRequest({
            requestId: finalReqId,
            tokenId,
            fromDID: requestedByDID,
            toDID,
            status: 'PENDING',
            reason
        });
        await transferDoc.save();

        // Update asset status in MongoDB
        await Asset.findOneAndUpdate(
            { tokenId },
            { status: 'TRANSFER_PENDING' }
        );

        return res.status(201).json({ success: true, data: transferDoc });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.approveTransferRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { approverDID } = req.body;
        if (!approverDID) {
            return res.status(400).json({ success: false, error: 'Missing required field: approverDID' });
        }

        let fabricRes = null;
        try {
            fabricRes = await submitTransaction('ApproveTransferRequest', approverDID, requestId);
        } catch (e) {
            console.warn('[ApproveTransferRequest Fabric notice]:', e.message);
        }

        // Update in MongoDB
        const reqDoc = await TransferRequest.findOneAndUpdate(
            { requestId },
            { status: 'APPROVED', approverDID },
            { new: true }
        );

        if (reqDoc) {
            await Asset.findOneAndUpdate(
                { tokenId: reqDoc.tokenId },
                {
                    custodian: reqDoc.toDID,
                    ownerDID: reqDoc.toDID,
                    status: 'ACTIVE'
                }
            );
        }

        return res.status(200).json({ success: true, data: reqDoc || fabricRes });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.rejectTransferRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { approverDID, reason = '' } = req.body;
        if (!approverDID) {
            return res.status(400).json({ success: false, error: 'Missing required field: approverDID' });
        }

        let fabricRes = null;
        try {
            fabricRes = await submitTransaction('RejectTransferRequest', approverDID, requestId, reason);
        } catch (e) {
            console.warn('[RejectTransferRequest Fabric notice]:', e.message);
        }

        const reqDoc = await TransferRequest.findOneAndUpdate(
            { requestId },
            { status: 'REJECTED', approverDID, rejectionReason: reason },
            { new: true }
        );

        if (reqDoc) {
            await Asset.findOneAndUpdate(
                { tokenId: reqDoc.tokenId },
                { status: 'ACTIVE' }
            );
        }

        return res.status(200).json({ success: true, data: reqDoc || fabricRes });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.getPendingTransferRequests = async (req, res) => {
    try {
        let fabricReqs = [];
        try {
            const result = await evaluateTransaction('GetPendingTransferRequests');
            fabricReqs = Array.isArray(result) ? result : (typeof result === 'string' ? JSON.parse(result) : []);
        } catch (e) {
            console.warn('[GetPendingTransferRequests Fabric fallback]:', e.message);
        }

        const mongoReqs = await TransferRequest.find({ status: 'PENDING' }).sort({ createdAt: -1 }).lean();
        const reqMap = new Map();

        fabricReqs.forEach(r => {
            if (r && r.requestId) reqMap.set(r.requestId, r);
        });

        mongoReqs.forEach(r => {
            if (!reqMap.has(r.requestId)) {
                reqMap.set(r.requestId, r);
            }
        });

        const combined = Array.from(reqMap.values());
        return res.status(200).json({ success: true, data: combined });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getTransferRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        try {
            const result = await evaluateTransaction('GetTransferRequest', requestId);
            return res.status(200).json({ success: true, data: result });
        } catch {
            const reqDoc = await TransferRequest.findOne({ requestId });
            if (reqDoc) {
                return res.status(200).json({ success: true, data: reqDoc });
            }
            return res.status(404).json({ success: false, error: 'Transfer request not found' });
        }
    } catch (err) {
        return res.status(404).json({ success: false, error: err.message });
    }
};

exports.getTransferRequestsByDID = async (req, res) => {
    try {
        const { did } = req.params;
        let fabricReqs = [];
        try {
            const result = await evaluateTransaction('GetTransferRequestsByDID', did);
            fabricReqs = Array.isArray(result) ? result : (typeof result === 'string' ? JSON.parse(result) : []);
        } catch (e) {
            console.warn('[GetTransferRequestsByDID Fabric fallback]:', e.message);
        }

        const mongoReqs = await TransferRequest.find({
            $or: [{ fromDID: did }, { toDID: did }]
        }).sort({ createdAt: -1 }).lean();

        const reqMap = new Map();
        fabricReqs.forEach(r => {
            if (r && r.requestId) reqMap.set(r.requestId, r);
        });

        mongoReqs.forEach(r => {
            if (!reqMap.has(r.requestId)) {
                reqMap.set(r.requestId, r);
            }
        });

        const combined = Array.from(reqMap.values());
        return res.status(200).json({ success: true, data: combined });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
