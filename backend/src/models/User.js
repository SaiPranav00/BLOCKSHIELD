const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    did: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'], default: 'USER', index: true },
    status: { type: String, enum: ['ACTIVE', 'PENDING_APPROVAL', 'REVOKED'], default: 'ACTIVE', index: true },
    name: { type: String, default: '' },
    department: { type: String, default: 'R&D', index: true },
    userCategory: { type: String, enum: ['DEFENCE', 'SOFTWARE', 'NON_DEFENCE'], default: 'DEFENCE', index: true },
    idProofType: { type: String, default: '' },
    idProofNumber: { type: String, default: '' },
    orgProof: { type: mongoose.Schema.Types.Mixed, default: {} },
    publicKey: { type: String, default: '' },
}, { timestamps: true });

// Compound indexes for scalable authorization & role directory queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ userCategory: 1, status: 1 });
userSchema.index({ department: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
