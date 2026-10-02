const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');

exports.createTransferRequest = async (req, res) => {
    try {
        const { requestedByDID, tokenId, toDID, reason = '' } = req.body;
        if (!requestedByDID || !tokenId || !toDID) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: requestedByDID, tokenId, toDID'
            });
        }

        const result = await submitTransaction('CreateTransferRequest', requestedByDID, tokenId, toDID, reason);
        return res.status(201).json({ success: true, data: result });
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

        const result = await submitTransaction('ApproveTransferRequest', approverDID, requestId);
        return res.status(200).json({ success: true, data: result });
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

        const result = await submitTransaction('RejectTransferRequest', approverDID, requestId, reason);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.getPendingTransferRequests = async (req, res) => {
    try {
        const result = await evaluateTransaction('GetPendingTransferRequests');
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getTransferRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const result = await evaluateTransaction('GetTransferRequest', requestId);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(404).json({ success: false, error: err.message });
    }
};

exports.getTransferRequestsByDID = async (req, res) => {
    try {
        const { did } = req.params;
        const result = await evaluateTransaction('GetTransferRequestsByDID', did);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
