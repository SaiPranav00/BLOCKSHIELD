const { evaluateTransaction } = require('../fabric/gateway');
const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
    try {
        let fabricLogs = [];
        try {
            const result = await evaluateTransaction('GetAuditLogs');
            fabricLogs = Array.isArray(result) ? result : (typeof result === 'string' ? JSON.parse(result) : []);
        } catch (e) {
            console.warn('[GetAuditLogs Fabric fallback]:', e.message);
        }

        const mongoLogs = await AuditLog.find({}).sort({ timestamp: -1 }).lean();
        const logMap = new Map();

        fabricLogs.forEach(l => {
            if (l && (l.eventId || l.txId)) {
                logMap.set(l.eventId || l.txId, l);
            }
        });

        mongoLogs.forEach(l => {
            if (!logMap.has(l.eventId)) {
                logMap.set(l.eventId, l);
            }
        });

        const combined = Array.from(logMap.values());
        return res.status(200).json({ success: true, data: combined });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAuditLogsByResource = async (req, res) => {
    try {
        const { resourceId } = req.params;
        let fabricLogs = [];
        try {
            const result = await evaluateTransaction('GetAuditLogsByResource', resourceId);
            fabricLogs = Array.isArray(result) ? result : (typeof result === 'string' ? JSON.parse(result) : []);
        } catch (e) {
            console.warn('[GetAuditLogsByResource Fabric fallback]:', e.message);
        }

        const mongoLogs = await AuditLog.find({
            $or: [
                { resourceId: new RegExp(resourceId, 'i') },
                { actorDID: new RegExp(resourceId, 'i') },
                { eventId: new RegExp(resourceId, 'i') }
            ]
        }).sort({ timestamp: -1 }).lean();

        const logMap = new Map();
        fabricLogs.forEach(l => {
            if (l && (l.eventId || l.txId)) {
                logMap.set(l.eventId || l.txId, l);
            }
        });

        mongoLogs.forEach(l => {
            if (!logMap.has(l.eventId)) {
                logMap.set(l.eventId, l);
            }
        });

        const combined = Array.from(logMap.values());
        return res.status(200).json({ success: true, data: combined });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
