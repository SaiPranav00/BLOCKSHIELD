const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
    requestId: { type: String, required: true, unique: true, index: true },
    tokenId: { type: String, required: true, index: true },
    fromDID: { type: String, required: true, index: true },
    toDID: { type: String, required: true, index: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    reason: { type: String, default: '' },
    approverDID: { type: String, default: '', index: true },
    rejectionReason: { type: String, default: '' }
}, { timestamps: true });

// Compound indexes for scalable transfer review queues & history tracking
transferRequestSchema.index({ status: 1, createdAt: -1 });
transferRequestSchema.index({ fromDID: 1, status: 1 });
transferRequestSchema.index({ toDID: 1, status: 1 });
transferRequestSchema.index({ tokenId: 1, status: 1 });

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
