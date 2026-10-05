const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    tokenId: { type: String, required: true, unique: true, index: true },
    assetId: { type: String, default: '' },
    assetName: { type: String, required: true },
    assetType: { type: String, default: 'HARDWARE' },
    legalOwner: { type: String, default: 'BEL' },
    custodian: { type: String, default: '', index: true },
    ownerDID: { type: String, default: '', index: true },
    department: { type: String, default: 'R&D', index: true },
    location: { type: String, default: 'HQ' },
    metadata: { type: String, default: '{}' },
    metadataHash: { type: String, default: '' },
    creatorDID: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'TRANSFER_PENDING', 'REVOKED'], default: 'ACTIVE', index: true }
}, { timestamps: true });

// Compound indexes for scalable multi-field queries
assetSchema.index({ custodian: 1, status: 1 });
assetSchema.index({ department: 1, status: 1 });
assetSchema.index({ ownerDID: 1, status: 1 });

module.exports = mongoose.model('Asset', assetSchema);
