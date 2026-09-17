const crypto = require('crypto');
const { evaluateTransaction } = require('../fabric/gateway');

/**
 * Verifies a cryptographic signature against a DID's registered public key.
 * Private keys are NEVER stored or accepted by the backend.
 *
 * @param {string} did - Decentralized Identity (e.g. did:sih26125:N123456)
 * @param {string} message - Original message or payload signed by client
 * @param {string} signature - Hex or Base64 encoded signature
 * @param {string} [publicKeyPem] - Optional public key PEM (if omitted, fetched from ledger)
 * @returns {Promise<{valid: boolean, did: string, reason?: string}>}
 */
async function verifyDIDSignature(did, message, signature, publicKeyPem = null) {
    try {
        if (!did || !message || !signature) {
            return { valid: false, did, reason: 'Missing did, message, or signature parameter' };
        }

        let pubKey = publicKeyPem;
        if (!pubKey) {
            const identityRecord = await evaluateTransaction('GetDID', did);
            if (!identityRecord || !identityRecord.publicKey) {
                return { valid: false, did, reason: `Public key not found for DID ${did}` };
            }
            pubKey = identityRecord.publicKey;
        }

        // Format public key if raw Base64/Hex RSA/ECDSA/Ed25519 string without headers
        let formattedKey = pubKey;
        if (!pubKey.includes('-----BEGIN PUBLIC KEY-----')) {
            formattedKey = `-----BEGIN PUBLIC KEY-----\n${pubKey}\n-----END PUBLIC KEY-----`;
        }

        const msgBuffer = Buffer.from(message, 'utf-8');
        let sigBuffer;
        if (/^[0-9a-fA-F]+$/.test(signature)) {
            sigBuffer = Buffer.from(signature, 'hex');
        } else {
            sigBuffer = Buffer.from(signature, 'base64');
        }

        let isVerified = false;
        try {
            isVerified = crypto.verify(
                null,
                msgBuffer,
                { key: formattedKey, padding: crypto.constants.RSA_PKCS1_PADDING },
                sigBuffer
            );
        } catch {
            isVerified = false;
        }

        if (!isVerified) {
            try {
                isVerified = crypto.verify('SHA256', msgBuffer, formattedKey, sigBuffer);
            } catch {
                isVerified = false;
            }
        }

        if (isVerified) {
            return { valid: true, did };
        } else {
            return { valid: false, did, reason: 'Signature verification failed' };
        }
    } catch (err) {
        return { valid: false, did, reason: err.message };
    }
}

/**
 * Helper utility to generate keypairs for client testing/demo purposes only.
 */
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
}

function signMessage(message, privateKeyPem) {
    const signer = crypto.createSign('SHA256');
    signer.update(message);
    signer.end();
    return signer.sign(privateKeyPem, 'hex');
}

module.exports = {
    verifyDIDSignature,
    generateKeyPair,
    signMessage,
};
