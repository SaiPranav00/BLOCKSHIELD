const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const port = process.env.PORT || 5000;
const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'sih26125';
const mspId = process.env.MSP_ID || 'Org1MSP';
const peerEndpoint = process.env.PEER_ENDPOINT || 'localhost:7051';
const peerHostAlias = process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com';

const defaultTlsPath = '../blockchain/network/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem';
const defaultUserCertPath = '../blockchain/network/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/cert.pem';
const defaultKeyDirPath = '../blockchain/network/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore';

const tlsCertPath = path.resolve(__dirname, '../../', process.env.TLS_CERT_PATH || defaultTlsPath);
const userCertPath = path.resolve(__dirname, '../../', process.env.USER_CERT_PATH || defaultUserCertPath);
const keyDirPath = path.resolve(__dirname, '../../', process.env.KEY_DIR_PATH || defaultKeyDirPath);

function getUserCertPath() {
    if (fs.existsSync(userCertPath)) {
        return userCertPath;
    }
    const certDir = path.dirname(userCertPath);
    if (fs.existsSync(certDir)) {
        const files = fs.readdirSync(certDir);
        const certFile = files.find(file => file.endsWith('.pem'));
        if (certFile) {
            return path.join(certDir, certFile);
        }
    }
    return userCertPath;
}

function getKeyPath() {
    if (!fs.existsSync(keyDirPath)) {
        throw new Error(`Key directory path does not exist: ${keyDirPath}`);
    }
    const files = fs.readdirSync(keyDirPath);
    const keyFile = files.find(file => file.endsWith('_sk') || file.endsWith('.pem') || file.length > 20);
    if (!keyFile) {
        throw new Error(`No private key file found in ${keyDirPath}`);
    }
    return path.join(keyDirPath, keyFile);
}

let gatewayInstance = null;
let networkInstance = null;
let contractInstance = null;
let grpcClientInstance = null;

// Mock ledger state for offline/testing mode
const mockStore = {
    identities: new Map(),
    nfts: new Map(),
    auditLogs: [],
};

function executeMockTransaction(funcName, args) {
    const now = new Date().toISOString();
    switch (funcName) {
        case 'CreateDID': {
            const [did, publicKey, role] = args;
            if (mockStore.identities.has(did)) {
                throw new Error(`identity with DID ${did} already exists`);
            }
            const identity = {
                docType: 'identity',
                did,
                publicKey,
                role: (role || 'USER').toUpperCase(),
                status: 'ACTIVE',
                createdBy: 'e2e_mock_client_id',
                createdAt: now,
                updatedAt: now,
            };
            mockStore.identities.set(did, identity);
            mockStore.auditLogs.push({
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
            return Array.from(mockStore.identities.values());
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
            target.role = newRole.toUpperCase();
            target.updatedAt = now;
            mockStore.identities.set(targetDID, target);
            return target;
        }

        case 'GetRole': {
            const [did] = args;
            const identity = mockStore.identities.get(did);
            if (!identity) throw new Error(`identity ${did} does not exist`);
            return identity.role;
        }

        case 'MintNFT': {
            const [adminDID, tokenId, assetName, assetType, metadataStr] = args;
            const admin = mockStore.identities.get(adminDID);
            if (!admin || admin.role !== 'ADMIN' || admin.status !== 'ACTIVE') {
                throw new Error(`access denied: actor DID ${adminDID} not authorized for MintNFT`);
            }
            if (mockStore.nfts.has(tokenId)) {
                throw new Error(`NFT token ID ${tokenId} already exists`);
            }
            const nft = {
                docType: 'nft',
                tokenId,
                assetName,
                assetType: (assetType || '').toUpperCase(),
                metadata: metadataStr,
                creatorDID: adminDID,
                ownerDID: '',
                status: 'ACTIVE',
                createdAt: now,
                updatedAt: now,
            };
            mockStore.nfts.set(tokenId, nft);
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
            const actor = mockStore.identities.get(actorDID);
            if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'MANAGER') || actor.status !== 'ACTIVE') {
                throw new Error(`access denied: actor DID ${actorDID} not authorized for AllocateNFT`);
            }
            const nft = mockStore.nfts.get(tokenId);
            if (!nft) throw new Error(`NFT ${tokenId} does not exist`);
            if (nft.status === 'REVOKED') throw new Error(`cannot allocate revoked NFT ${tokenId}`);
            const owner = mockStore.identities.get(ownerDID);
            if (!owner || owner.status !== 'ACTIVE') throw new Error(`target owner DID ${ownerDID} not active`);
            nft.ownerDID = ownerDID;
            nft.updatedAt = now;
            mockStore.nfts.set(tokenId, nft);
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

        case 'GetAssetsByOwnerDID': {
            const [did] = args;
            return Array.from(mockStore.nfts.values()).filter(nft => nft.ownerDID === did);
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

async function getContract() {
    if (contractInstance) {
        return contractInstance;
    }

    const tlsRootCert = fs.readFileSync(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    
    grpcClientInstance = new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });

    const certificate = fs.readFileSync(getUserCertPath());
    const privateKeyPem = fs.readFileSync(getKeyPath());
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signer = signers.newPrivateKeySigner(privateKey);

    gatewayInstance = connect({
        client: grpcClientInstance,
        identity: { mspId, credentials: certificate },
        signer,
        hash: hash.sha256,
    });

    networkInstance = gatewayInstance.getNetwork(channelName);
    contractInstance = networkInstance.getContract(chaincodeName);
    return contractInstance;
}

function parseFabricError(err) {
    if (err.details && Array.isArray(err.details) && err.details.length > 0 && err.details[0].message) {
        let msg = err.details[0].message;
        msg = msg.replace(/^chaincode response \d+,\s*/i, '').trim();
        return new Error(msg);
    }
    if (err.message) {
        let cleanMsg = err.message
            .replace(/10 ABORTED: failed to endorse transaction, see attached details for more info/gi, '')
            .replace(/Transaction [a-f0-9]+ failed to commit with status code 11 \(MVCC_READ_CONFLICT\)/gi, 'Concurrent transaction collision (MVCC_READ_CONFLICT). Retried automatically.')
            .trim();
        return new Error(cleanMsg || err.message);
    }
    return err;
}

async function submitTransaction(funcName, ...args) {
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_GATEWAY === 'true') {
        return executeMockTransaction(funcName, args);
    }
    const maxRetries = 3;
    const baseDelay = 300;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const contract = await getContract();
            const resultBytes = await contract.submitTransaction(funcName, ...args);
            const resultStr = new TextDecoder().decode(resultBytes);
            if (!resultStr) return {};
            try {
                return JSON.parse(resultStr);
            } catch {
                return { message: resultStr };
            }
        } catch (err) {
            const isMvccConflict = err.message && (err.message.includes('MVCC_READ_CONFLICT') || err.message.includes('status code 11'));
            if (isMvccConflict && attempt < maxRetries) {
                console.warn(`[Fabric Gateway] MVCC_READ_CONFLICT detected for '${funcName}'. Retrying attempt ${attempt}/${maxRetries} in ${baseDelay * attempt}ms...`);
                await new Promise(r => setTimeout(r, baseDelay * attempt));
                continue;
            }
            if (process.env.ALLOW_MOCK_FALLBACK === 'true') {
                return executeMockTransaction(funcName, args);
            }
            throw parseFabricError(err);
        }
    }
}

async function evaluateTransaction(funcName, ...args) {
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_GATEWAY === 'true') {
        return executeMockTransaction(funcName, args);
    }
    try {
        const contract = await getContract();
        const resultBytes = await contract.evaluateTransaction(funcName, ...args);
        const resultStr = new TextDecoder().decode(resultBytes);
        if (!resultStr) return {};
        try {
            return JSON.parse(resultStr);
        } catch {
            return { message: resultStr };
        }
    } catch (err) {
        if (process.env.ALLOW_MOCK_FALLBACK === 'true') {
            return executeMockTransaction(funcName, args);
        }
        throw parseFabricError(err);
    }
}


module.exports = {
    getContract,
    submitTransaction,
    evaluateTransaction,
};
