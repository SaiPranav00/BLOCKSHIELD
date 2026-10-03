const mongoose = require('mongoose');

const messageSubSchema = new mongoose.Schema({
    msgId: { type: String, required: true },
    senderDID: { type: String, required: true },
    senderName: { type: String, default: '' },
    senderRole: { type: String, default: 'USER' },
    recipientTarget: { type: String, default: 'EVERYONE' },
    content: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toISOString() }
}, { _id: false });

const messageThreadSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    category: { type: String, default: 'GENERAL_CHAT', index: true },
    status: { type: String, default: 'PENDING', index: true },
    senderDID: { type: String, required: true, index: true },
    senderName: { type: String, default: '' },
    senderRole: { type: String, default: 'USER' },
    targetRole: { type: String, default: 'ADMIN', index: true },
    assignedManagerDID: { type: String, default: '', index: true },
    title: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    messages: [messageSubSchema]
}, { timestamps: true });

// Compound indexes for fast channel & status filtering
messageThreadSchema.index({ category: 1, status: 1 });
messageThreadSchema.index({ targetRole: 1, status: 1 });
messageThreadSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('MessageThread', messageThreadSchema);
