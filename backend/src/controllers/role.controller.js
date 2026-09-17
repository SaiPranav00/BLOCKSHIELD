const { submitTransaction, evaluateTransaction } = require('../fabric/gateway');

exports.assignRole = async (req, res) => {
    try {
        const { adminDID, targetDID, newRole } = req.body;
        if (!adminDID || !targetDID || !newRole) {
            return res.status(400).json({ success: false, error: 'Missing required parameters: adminDID, targetDID, newRole' });
        }
        const result = await submitTransaction('AssignRole', adminDID, targetDID, newRole);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};

exports.getRole = async (req, res) => {
    try {
        const { did } = req.params;
        const result = await evaluateTransaction('GetRole', did);
        return res.status(200).json({ success: true, data: { did, role: typeof result === 'string' ? result : result.message || result } });
    } catch (err) {
        return res.status(404).json({ success: false, error: err.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { did } = req.params;
        const { adminDID, newRole } = req.body;
        if (!adminDID || !newRole) {
            return res.status(400).json({ success: false, error: 'Missing required parameters: adminDID, newRole' });
        }
        const result = await submitTransaction('AssignRole', adminDID, did, newRole);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res.status(403).json({ success: false, error: err.message });
    }
};
