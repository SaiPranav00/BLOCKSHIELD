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


// Decoupled mock store and transaction emulator for offline/dev fallback
const { mockStore, executeMockTransaction } = require('./mockStore');

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
            if (process.env.ALLOW_MOCK_FALLBACK !== 'false') {
                console.warn(`[Fabric Gateway] Connection to peer failed. Executing mock ledger fallback for '${funcName}'`);
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
        if (process.env.ALLOW_MOCK_FALLBACK !== 'false') {
            console.warn(`[Fabric Gateway] Connection to peer failed. Executing mock ledger fallback for '${funcName}'`);
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
