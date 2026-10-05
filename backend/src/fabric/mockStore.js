// In-Memory Mock Store & Transaction Emulator for Hyperledger Fabric Gateway
// Decoupled for clean architecture & offline development

const mockStore = {
    identities: new Map([
        ['did:sih26125:ADMIN001', { did: 'did:sih26125:ADMIN001', role: 'ADMIN', department: 'Executive', status: 'ACTIVE' }],
        ['did:sih26125:MANAGER001', { did: 'did:sih26125:MANAGER001', role: 'MANAGER', department: 'R&D', status: 'ACTIVE' }],
        ['did:sih26125:AUDITOR001', { did: 'did:sih26125:AUDITOR001', role: 'AUDITOR', department: 'Compliance', status: 'ACTIVE' }],
        ['did:sih26125:USER001', { did: 'did:sih26125:USER001', role: 'USER', department: 'R&D', status: 'ACTIVE' }],
        ['did:sih26125:N123456', { did: 'did:sih26125:N123456', role: 'USER', department: 'R&D', status: 'ACTIVE' }],
    ]),
    nfts: new Map([
        ['NFT-1001', {
            docType: 'nft',
            tokenId: 'NFT-1001',
            assetId: 'BEL-RF-00421',
            assetName: 'RF Signal Analyzer',
            assetType: 'TESTING_EQUIPMENT',
            legalOwner: 'BEL',
            custodian: 'did:sih26125:N123456',
            ownerDID: 'did:sih26125:N123456',
            department: 'R&D',
            location: 'R&D Lab 1',
            metadata: JSON.stringify({ frequencyRange: '9kHz - 6GHz', calibrationDue: '2027-01' }),
            metadataHash: 'a7b8c9d0e1f2',
            creatorDID: 'did:sih26125:ADMIN001',
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
        }],
        ['NFT-1002', {
            docType: 'nft',
            tokenId: 'NFT-1002',
            assetId: 'BEL-WS-0077',
            assetName: 'Engineering Workstation',
            assetType: 'HARDWARE',
            legalOwner: 'BEL',
            custodian: 'did:sih26125:USER001',
            ownerDID: 'did:sih26125:USER001',
            department: 'R&D',
            location: 'Building B, Floor 2',
            metadata: JSON.stringify({ ram: '128GB', gpu: 'RTX A6000' }),
            metadataHash: 'f1e2d3c4b5a6',
            creatorDID: 'did:sih26125:ADMIN001',
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            updatedAt: new Date(Date.now() - 7200000).toISOString(),
        }]
    ]),
    transferRequests: new Map(),
    auditLogs: [
        {
            docType: 'audit',
            eventId: 'AUDIT_INIT_001',
            actorDID: 'did:sih26125:ADMIN001',
            action: 'IDENTITY_CREATED',
            resourceId: 'did:sih26125:ADMIN001',
            result: 'ALLOWED',
            timestamp: String(Math.floor((Date.now() - 10800000) / 1000)),
            details: 'System Administrator Identity Registered'
        },
        {
            docType: 'audit',
            eventId: 'AUDIT_INIT_002',
            actorDID: 'did:sih26125:ADMIN001',
            action: 'ASSET_MINTED',
            resourceId: 'NFT-1001',
            result: 'ALLOWED',
            timestamp: String(Math.floor((Date.now() - 3600000) / 1000)),
            details: 'Minted tokenized asset RF Signal Analyzer (BEL-RF-00421)'
        },
        {
            docType: 'audit',
            eventId: 'AUDIT_INIT_003',
            actorDID: 'did:sih26125:ADMIN001',
            action: 'ASSET_ALLOCATED',
            resourceId: 'NFT-1001',
            result: 'ALLOWED',
            timestamp: String(Math.floor((Date.now() - 1800000) / 1000)),
            details: 'Allocated NFT-1001 custodian to did:sih26125:N123456'
        }
    ],
};

function executeMockTransaction(funcName, args) {
    const now = new Date().toISOString();
    switch (funcName) {
        case 'CreateDID': {
            const [did, publicKey, role] = args;
            const targetRole = (role || 'USER').toUpperCase();
            if (targetRole === 'ADMIN' && did !== 'did:sih26125:ADMIN001') {
                throw new Error('System policy error: Only one primary Administrator (did:sih26125:ADMIN001) is permitted.');
            }

            // Sync User model in MongoDB
            try {
                const User = require('../models/User');
                User.findOneAndUpdate({ did }, { status: 'ACTIVE', role: targetRole }).catch(() => {});
            } catch (e) {
                // Ignore sync errors
            }

            if (mockStore.identities.has(did)) {
                const existing = mockStore.identities.get(did);
                existing.status = 'ACTIVE';
                existing.role = targetRole;
                if (publicKey) existing.publicKey = publicKey;
                existing.updatedAt = now;
                mockStore.identities.set(did, existing);

                mockStore.auditLogs.unshift({
                    docType: 'audit',
                    eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    actorDID: 'did:sih26125:ADMIN001',
                    action: 'CREATE_DID',
                    resourceId: did,
                    result: 'ALLOWED',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    details: `DID approved/activated on ledger with role ${existing.role}`
                });
                return existing;
            }

            const identity = {
                docType: 'identity',
                did,
                publicKey: publicKey || 'RSA-2048-PUBKEY',
                role: targetRole,
                status: 'ACTIVE',
                createdBy: 'e2e_mock_client_id',
                createdAt: now,
                updatedAt: now,
            };
            mockStore.identities.set(did, identity);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                actorDID: 'e2e_mock_client_id',
                action: 'CREATE_DID',
                resourceId: did,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `DID registered with role ${identity.role}`
            });
            return identity;
        }

        case 'GetDID': {
            const [did] = args;
            const identity = mockStore.identities.get(did);
            if (!identity) {
                throw new Error(`identity ${did} does not exist`);
            }
            return identity;
        }

        case 'GetAllDIDs': {
            // Clean identity retrieval
            // Filter out any duplicate/stray ADMIN identities except did:sih26125:ADMIN001
            const allIdentities = Array.from(mockStore.identities.values());
            return allIdentities.filter(item => {
                if (item.role === 'ADMIN' && item.did !== 'did:sih26125:ADMIN001') {
                    return false;
                }
                return true;
            });
        }

        case 'UpdateDID': {
            const [did, newPublicKey, newRole] = args;
            const identity = mockStore.identities.get(did);
            if (!identity) {
                throw new Error(`identity ${did} does not exist`);
            }
            if (identity.status === 'REVOKED') {
                throw new Error(`cannot update revoked DID ${did}`);
            }
            if (newPublicKey) identity.publicKey = newPublicKey;
            if (newRole) identity.role = newRole.toUpperCase();
            identity.updatedAt = now;
            mockStore.identities.set(did, identity);
            return identity;
        }

        case 'RevokeDID': {
            const [did] = args;
            const identity = mockStore.identities.get(did);
            if (!identity) {
                throw new Error(`identity ${did} does not exist`);
            }
            identity.status = 'REVOKED';
            identity.updatedAt = now;
            mockStore.identities.set(did, identity);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                actorDID: 'did:sih26125:ADMIN001',
                action: 'REVOKE_DID',
                resourceId: did,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Revoked identity ${did}`
            });
            return identity;
        }

        case 'VerifyDID': {
            const [did] = args;
            const identity = mockStore.identities.get(did);
            if (!identity) return { valid: false, reason: 'DID not found' };
            if (identity.status !== 'ACTIVE') return { valid: false, did: identity.did, status: identity.status };
            return { valid: true, did: identity.did, role: identity.role, status: 'ACTIVE' };
        }

        case 'AssignRole': {
            const [adminDID, targetDID, newRole] = args;
            const admin = mockStore.identities.get(adminDID);
            if (!admin || admin.role !== 'ADMIN' || admin.status !== 'ACTIVE') {
                throw new Error(`access denied: actor DID ${adminDID} not authorized for AssignRole`);
            }
            const target = mockStore.identities.get(targetDID);
            if (!target) throw new Error(`target DID ${targetDID} not found`);
            const roleToAssign = (newRole || '').toUpperCase();
            if (roleToAssign === 'ADMIN' && targetDID !== 'did:sih26125:ADMIN001') {
                throw new Error('System policy error: Only one primary Administrator (did:sih26125:ADMIN001) is permitted.');
            }
            target.role = roleToAssign;
            target.updatedAt = now;
            mockStore.identities.set(targetDID, target);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                actorDID: adminDID,
                action: 'ASSIGN_ROLE',
                resourceId: targetDID,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Assigned role ${newRole} to ${targetDID}`
            });
            return target;
        }

        case 'GetRole': {
            const [did] = args;
            const identity = mockStore.identities.get(did);
            if (!identity) throw new Error(`identity ${did} does not exist`);
            return identity.role;
        }

        case 'MintNFT': {
            const [adminDID, tokenId, assetName, assetType, metadataStr, targetOwnerDID] = args;
            const admin = mockStore.identities.get(adminDID);
            if (!admin || admin.role !== 'ADMIN' || admin.status !== 'ACTIVE') {
                throw new Error(`access denied: actor DID ${adminDID} not authorized for MintNFT`);
            }
            if (mockStore.nfts.has(tokenId)) {
                throw new Error(`NFT token ID ${tokenId} already exists`);
            }
            let initialOwner = '';
            if (targetOwnerDID && targetOwnerDID.trim() && targetOwnerDID !== 'UNASSIGNED') {
                initialOwner = targetOwnerDID.trim();
            }
            const nft = {
                docType: 'nft',
                tokenId,
                assetName,
                assetType: (assetType || '').toUpperCase(),
                metadata: metadataStr,
                creatorDID: adminDID,
                ownerDID: initialOwner,
                status: 'ACTIVE',
                createdAt: now,
                updatedAt: now,
            };
            mockStore.nfts.set(tokenId, nft);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                actorDID: adminDID,
                action: 'MINT_NFT',
                resourceId: tokenId,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: initialOwner
                    ? `Minted & Instantly Allocated Asset ${assetName} (${assetType}) to ${initialOwner}`
                    : `Minted Digital Asset ${assetName} (${assetType}) into Unassigned Pool`
            });
            return nft;
        }

        case 'GetAllNFTs': {
            return Array.from(mockStore.nfts.values());
        }

        case 'GetNFT': {
            const [tokenId] = args;
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) throw new Error(`NFT ${tokenId} does not exist`);
            return nft;
        }

        case 'AllocateNFT': {
            const [actorDID, tokenId, ownerDID] = args;
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) throw new Error(`NFT token ${tokenId} does not exist on Fabric ledger`);
            if (nft.status === 'REVOKED') throw new Error(`cannot allocate revoked NFT ${tokenId}`);
            
            // Auto-register/ensure owner identity is active on ledger
            let owner = mockStore.identities.get(ownerDID);
            if (!owner) {
                owner = {
                    docType: 'identity',
                    did: ownerDID,
                    publicKey: 'RSA-2048-PUBLIC-KEY',
                    role: 'USER',
                    status: 'ACTIVE',
                    createdAt: now,
                    updatedAt: now,
                };
                mockStore.identities.set(ownerDID, owner);
            } else if (owner.status !== 'ACTIVE') {
                owner.status = 'ACTIVE';
            }

            nft.ownerDID = ownerDID;
            nft.updatedAt = now;
            mockStore.nfts.set(tokenId, nft);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                actorDID: actorDID || 'did:sih26125:ADMIN001',
                action: 'ALLOCATE_NFT',
                resourceId: tokenId,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Allocated asset ${tokenId} to owner ${ownerDID}`
            });
            return nft;
        }

        case 'TransferNFT': {
            const [actorDID, tokenId, newOwnerDID] = args;
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) throw new Error(`NFT ${tokenId} does not exist`);
            if (nft.status !== 'ACTIVE') throw new Error(`cannot transfer NFT ${tokenId} with status ${nft.status}`);
            
            const actor = mockStore.identities.get(actorDID);
            if (actorDID !== nft.ownerDID && (!actor || actor.role !== 'ADMIN')) {
                throw new Error(`actor DID ${actorDID} is not current owner nor ADMIN`);
            }
            const newOwner = mockStore.identities.get(newOwnerDID);
            if (!newOwner || newOwner.status !== 'ACTIVE') throw new Error(`new owner DID ${newOwnerDID} not active`);

            nft.ownerDID = newOwnerDID;
            nft.updatedAt = now;
            mockStore.nfts.set(tokenId, nft);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                actorDID: actorDID,
                action: 'TRANSFER_NFT',
                resourceId: tokenId,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Transferred asset ${tokenId} ownership to ${newOwnerDID}`
            });
            return nft;
        }

        case 'RevokeNFT': {
            const [adminDID, tokenId] = args;
            const admin = mockStore.identities.get(adminDID);
            if (!admin || admin.role !== 'ADMIN') throw new Error(`access denied: actor DID ${adminDID} not authorized`);
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) throw new Error(`NFT ${tokenId} does not exist`);
            nft.status = 'REVOKED';
            nft.updatedAt = now;
            mockStore.nfts.set(tokenId, nft);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                actorDID: adminDID,
                action: 'REVOKE_NFT',
                resourceId: tokenId,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Revoked asset token ${tokenId}`
            });
            return nft;
        }

        case 'VerifyNFT': {
            const [tokenId] = args;
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) return { valid: false, exists: false, reason: 'NFT does not exist' };
            if (nft.status === 'REVOKED') {
                return { valid: false, exists: true, tokenId: nft.tokenId, status: 'REVOKED', reason: 'NFT status is REVOKED' };
            }
            let ownerStatus = 'ACTIVE';
            if (nft.ownerDID) {
                const owner = mockStore.identities.get(nft.ownerDID);
                ownerStatus = owner ? owner.status : 'NOT_FOUND';
            }
            const valid = nft.status === 'ACTIVE' && (ownerStatus === 'ACTIVE' || !nft.ownerDID);
            return {
                valid,
                exists: true,
                tokenId: nft.tokenId,
                assetName: nft.assetName,
                assetType: nft.assetType,
                metadata: nft.metadata,
                ownerDID: nft.ownerDID,
                ownerStatus,
                creatorDID: nft.creatorDID,
                status: nft.status
            };
        }

        case 'GetAssetsByOwnerDID':
        case 'GetAssetsByCustodianDID': {
            const [did] = args;
            return Array.from(mockStore.nfts.values()).filter(nft => nft.custodian === did || nft.ownerDID === did);
        }

        case 'GetAssetsByDepartment': {
            const [dept] = args;
            return Array.from(mockStore.nfts.values()).filter(nft => (nft.department || '').toLowerCase() === (dept || '').toLowerCase());
        }

        case 'CreateTransferRequest': {
            const [requestedByDID, tokenId, toDID, reason] = args;
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) throw new Error(`Asset ${tokenId} not found`);
            const reqId = `TR-${Date.now()}`;
            const req = {
                docType: 'transfer_request',
                requestId: reqId,
                tokenId,
                assetId: nft.assetId || tokenId,
                fromDID: nft.custodian || nft.ownerDID,
                toDID,
                requestedBy: requestedByDID,
                reason,
                status: 'PENDING',
                approvedBy: '',
                createdAt: now,
                approvedAt: ''
            };
            mockStore.transferRequests.set(reqId, req);
            nft.status = 'TRANSFER_PENDING';
            nft.updatedAt = now;
            mockStore.nfts.set(tokenId, nft);
            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}`,
                actorDID: requestedByDID,
                action: 'TRANSFER_REQUESTED',
                resourceId: reqId,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Requested asset ${tokenId} transfer from ${req.fromDID} to ${toDID}`
            });
            return req;
        }

        case 'ApproveTransferRequest': {
            const [approverDID, requestId] = args;
            const approver = mockStore.identities.get(approverDID);
            if (!approver || (approver.role !== 'ADMIN' && approver.role !== 'MANAGER')) {
                throw new Error(`access denied: actor DID ${approverDID} not authorized to approve transfers`);
            }
            const req = mockStore.transferRequests.get(requestId);
            if (!req) throw new Error(`Transfer request ${requestId} not found`);
            if (req.status !== 'PENDING') throw new Error(`Transfer request ${requestId} is already ${req.status}`);
            
            req.status = 'APPROVED';
            req.approvedBy = approverDID;
            req.approvedAt = now;
            mockStore.transferRequests.set(requestId, req);

            const nft = mockStore.nfts.get(req.tokenId);
            if (nft) {
                nft.custodian = req.toDID;
                nft.ownerDID = req.toDID;
                nft.status = 'ACTIVE';
                nft.updatedAt = now;
                mockStore.nfts.set(req.tokenId, nft);
            }

            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}`,
                actorDID: approverDID,
                action: 'TRANSFER_APPROVED',
                resourceId: requestId,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Approved transfer ${requestId}: Custodian updated to ${req.toDID}`
            });
            return req;
        }

        case 'RejectTransferRequest': {
            const [approverDID, requestId, reason] = args;
            const approver = mockStore.identities.get(approverDID);
            if (!approver || (approver.role !== 'ADMIN' && approver.role !== 'MANAGER')) {
                throw new Error(`access denied: actor DID ${approverDID} not authorized to reject transfers`);
            }
            const req = mockStore.transferRequests.get(requestId);
            if (!req) throw new Error(`Transfer request ${requestId} not found`);
            
            req.status = 'REJECTED';
            req.approvedBy = approverDID;
            req.approvedAt = now;
            mockStore.transferRequests.set(requestId, req);

            const nft = mockStore.nfts.get(req.tokenId);
            if (nft) {
                nft.status = 'ACTIVE';
                nft.updatedAt = now;
                mockStore.nfts.set(req.tokenId, nft);
            }

            mockStore.auditLogs.unshift({
                docType: 'audit',
                eventId: `AUDIT_${Date.now()}`,
                actorDID: approverDID,
                action: 'TRANSFER_REJECTED',
                resourceId: requestId,
                result: 'ALLOWED',
                timestamp: String(Math.floor(Date.now() / 1000)),
                details: `Rejected transfer ${requestId}: ${reason || 'No reason provided'}`
            });
            return req;
        }

        case 'GetPendingTransferRequests': {
            return Array.from(mockStore.transferRequests.values()).filter(r => r.status === 'PENDING');
        }

        case 'GetTransferRequest': {
            const [requestId] = args;
            const req = mockStore.transferRequests.get(requestId);
            if (!req) throw new Error(`Transfer request ${requestId} not found`);
            return req;
        }

        case 'GetTransferRequestsByDID': {
            const [did] = args;
            return Array.from(mockStore.transferRequests.values()).filter(r => r.fromDID === did || r.toDID === did || r.requestedBy === did);
        }

        case 'GetNFTHistory': {
            const [tokenId] = args;
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) return [];
            return [{ txId: 'tx_mock_hist_1', timestamp: String(Math.floor(Date.now() / 1000)), isDelete: false, nft }];
        }

        case 'GetAuditLogs': {
            return mockStore.auditLogs;
        }

        case 'GetAuditLogsByResource': {
            const [resourceId] = args;
            return mockStore.auditLogs.filter(log => log.resourceId === resourceId);
        }

        case 'CheckAccess': {
            const [actorDID, allowedRoles] = args;
            const identity = mockStore.identities.get(actorDID);
            if (!identity || identity.status !== 'ACTIVE') throw new Error(`access denied: DID ${actorDID} not active`);
            if (identity.role === 'ADMIN' || allowedRoles.includes(identity.role)) {
                return identity;
            }
            throw new Error(`access denied: role ${identity.role} not authorized`);
        }

        default:
            return { message: `Function ${funcName} executed` };
    }
}

module.exports = {
    mockStore,
    executeMockTransaction
};
