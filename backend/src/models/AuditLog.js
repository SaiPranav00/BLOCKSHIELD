const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true, index: true },
    actorDID: { type: String, index: true },
    action: { type: String, index: true },
    resourceId: { type: String, index: true },
    result: { type: String, enum: ['ALLOWED', 'DENIED'], default: 'ALLOWED', index: true },
    timestamp: { type: String, default: () => String(Math.floor(Date.now() / 1000)), index: true },
    details: { type: String, default: '' }
}, { timestamps: true });

// Compound indexes for scalable forensic audit log queries & time-series retrieval
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceId: 1, timestamp: -1 });
auditLogSchema.index({ actorDID: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
