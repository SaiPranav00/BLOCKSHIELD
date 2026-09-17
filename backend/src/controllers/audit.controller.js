const { evaluateTransaction } = require('../fabric/gateway');

exports.getAuditLogs = async (req, res) => {
    try {
        const result = await evaluateTransaction('GetAuditLogs');
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAuditLogsByResource = async (req, res) => {
    try {
        const { resourceId } = req.params;
        const result = await evaluateTransaction('GetAuditLogsByResource', resourceId);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
