const test = require('node:test');
const assert = require('node:assert');

// Set test environment flags
process.env.NODE_ENV = 'test';
process.env.MOCK_GATEWAY = 'true';

const app = require('../src/app');
const { generateKeyPair, signMessage, verifyDIDSignature } = require('../src/crypto/didCrypto');

let server;
const PORT = 5999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

test.before(() => {
    return new Promise((resolve) => {
        server = app.listen(PORT, () => resolve());
    });
});

test.after(() => {
    if (server) server.close();
});

test('GET /health returns 200 OK with UP status', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'UP');
});

test('POST /api/dids/generate-keypair generates RSA keypair', async () => {
    const res = await fetch(`${BASE_URL}/api/dids/generate-keypair`, { method: 'POST' });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.publicKey.includes('BEGIN PUBLIC KEY'));
    assert.ok(data.privateKey.includes('BEGIN PRIVATE KEY'));
});

test('Identity Endpoints (Create, Get, Update, Verify, Revoke)', async () => {
    const adminDID = 'did:sih26125:ADMIN01';
    const userDID = 'did:sih26125:USER01';

    // 1. Validation error on missing parameters
    const errRes = await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: adminDID })
    });
    assert.strictEqual(errRes.status, 400);

    // 2. Create Admin DID
    const createAdminRes = await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: adminDID, publicKey: 'pub_admin_key', role: 'ADMIN' })
    });
    const adminData = await createAdminRes.json();
    assert.strictEqual(createAdminRes.status, 201);
    assert.strictEqual(adminData.data.did, adminDID);
    assert.strictEqual(adminData.data.role, 'ADMIN');

    // 3. Create User DID
    const createUserRes = await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: userDID, publicKey: 'pub_user_key', role: 'USER' })
    });
    assert.strictEqual(createUserRes.status, 201);

    // 4. Get DID by ID
    const getRes = await fetch(`${BASE_URL}/api/dids/${userDID}`);
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getData.data.did, userDID);

    // 5. Get All DIDs
    const getAllRes = await fetch(`${BASE_URL}/api/dids`);
    const getAllData = await getAllRes.json();
    assert.strictEqual(getAllRes.status, 200);
    assert.ok(getAllData.data.length >= 2);

    // 6. Update DID
    const updateRes = await fetch(`${BASE_URL}/api/dids/${userDID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole: 'MANAGER' })
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateData.data.role, 'MANAGER');

    // 7. Verify DID
    const verifyRes = await fetch(`${BASE_URL}/api/dids/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: userDID })
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyData.data.valid, true);

    // 8. Revoke DID
    const revokeRes = await fetch(`${BASE_URL}/api/dids/${userDID}/revoke`, { method: 'POST' });
    const revokeData = await revokeRes.json();
    assert.strictEqual(revokeRes.status, 200);
    assert.strictEqual(revokeData.data.status, 'REVOKED');
});

test('Role Endpoints (Assign and Get)', async () => {
    const adminDID = 'did:sih26125:ADMIN_ROLE_TEST';
    const targetDID = 'did:sih26125:TARGET_USER';

    await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: adminDID, publicKey: 'key_admin', role: 'ADMIN' })
    });
    await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: targetDID, publicKey: 'key_target', role: 'USER' })
    });

    // 1. Assign role
    const assignRes = await fetch(`${BASE_URL}/api/roles/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminDID, targetDID, newRole: 'AUDITOR' })
    });
    const assignData = await assignRes.json();
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignData.data.role, 'AUDITOR');

    // 2. Get role
    const getRoleRes = await fetch(`${BASE_URL}/api/roles/${targetDID}`);
    const getRoleData = await getRoleRes.json();
    assert.strictEqual(getRoleRes.status, 200);
    assert.strictEqual(getRoleData.data.role, 'AUDITOR');
});

test('NFT Endpoints Lifecycle (Mint, Allocate, Transfer, Revoke, Search, History, Verify)', async () => {
    const adminDID = 'did:sih26125:ADMIN_NFT';
    const user1DID = 'did:sih26125:USER_NFT1';
    const user2DID = 'did:sih26125:USER_NFT2';
    const tokenId = 'NFT-TEST-100';

    await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: adminDID, publicKey: 'key_adm', role: 'ADMIN' })
    });
    await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: user1DID, publicKey: 'key_u1', role: 'USER' })
    });
    await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: user2DID, publicKey: 'key_u2', role: 'USER' })
    });

    // 1. Mint NFT
    const mintRes = await fetch(`${BASE_URL}/api/nfts/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminDID, tokenId, assetName: 'Land Title', assetType: 'PROPERTY', metadata: { plot: 42 } })
    });
    const mintData = await mintRes.json();
    assert.strictEqual(mintRes.status, 201);
    assert.strictEqual(mintData.data.tokenId, tokenId);

    // 2. Get All NFTs
    const getAllRes = await fetch(`${BASE_URL}/api/nfts`);
    const getAllData = await getAllRes.json();
    assert.strictEqual(getAllRes.status, 200);
    assert.ok(getAllData.data.length >= 1);

    // 3. Allocate NFT to User 1
    const allocRes = await fetch(`${BASE_URL}/api/nfts/${tokenId}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorDID: adminDID, ownerDID: user1DID })
    });
    const allocData = await allocRes.json();
    assert.strictEqual(allocRes.status, 200);
    assert.strictEqual(allocData.data.ownerDID, user1DID);

    // 4. Search Assets by Owner DID
    const searchRes = await fetch(`${BASE_URL}/api/nfts/owner/${user1DID}`);
    const searchData = await searchRes.json();
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchData.data.length, 1);
    assert.strictEqual(searchData.data[0].tokenId, tokenId);

    // 5. Transfer NFT from User 1 to User 2
    const xferRes = await fetch(`${BASE_URL}/api/nfts/${tokenId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorDID: user1DID, newOwnerDID: user2DID })
    });
    const xferData = await xferRes.json();
    assert.strictEqual(xferRes.status, 200);
    assert.strictEqual(xferData.data.ownerDID, user2DID);

    // 6. Verify Active NFT
    const verifyRes = await fetch(`${BASE_URL}/api/nfts/${tokenId}/verify`, { method: 'POST' });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyData.data.valid, true);

    // 7. Get NFT Ownership History
    const histRes = await fetch(`${BASE_URL}/api/nfts/${tokenId}/history`);
    const histData = await histRes.json();
    assert.strictEqual(histRes.status, 200);
    assert.ok(Array.isArray(histData.data));

    // 8. Revoke NFT
    const revokeRes = await fetch(`${BASE_URL}/api/nfts/${tokenId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminDID })
    });
    const revokeData = await revokeRes.json();
    assert.strictEqual(revokeRes.status, 200);
    assert.strictEqual(revokeData.data.status, 'REVOKED');
});

test('Audit Trail Endpoints', async () => {
    const res = await fetch(`${BASE_URL}/api/audit`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.data));
});

test('Access & Auth Endpoints', async () => {
    const { publicKey, privateKey } = generateKeyPair();
    const testDID = 'did:sih26125:AUTH_USER';

    await fetch(`${BASE_URL}/api/dids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: testDID, publicKey, role: 'USER' })
    });

    const message = 'login_challenge_msg';
    const signature = signMessage(message, privateKey);

    // Verify Auth
    const authRes = await fetch(`${BASE_URL}/api/access/verify-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: testDID, message, signature, publicKey })
    });
    const authData = await authRes.json();
    assert.strictEqual(authRes.status, 200);
    assert.strictEqual(authData.authenticated, true);
    assert.strictEqual(authData.role, 'USER');

    // Check Access
    const checkRes = await fetch(`${BASE_URL}/api/access/check-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorDID: testDID, allowedRoles: ['USER', 'MANAGER'] })
    });
    const checkData = await checkRes.json();
    assert.strictEqual(checkRes.status, 200);
    assert.strictEqual(checkData.allowed, true);
});

test('Cryptographic Key Generation and Signature Verification', async () => {
    const { publicKey, privateKey } = generateKeyPair();
    assert.ok(publicKey.includes('BEGIN PUBLIC KEY'));
    assert.ok(privateKey.includes('BEGIN PRIVATE KEY'));

    const message = 'test_payload_12345';
    const signature = signMessage(message, privateKey);
    assert.ok(signature && signature.length > 0);

    const testDID = 'did:sih26125:TEST001';
    const result = await verifyDIDSignature(testDID, message, signature, publicKey);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.did, testDID);
});

test('Cryptographic Signature Verification fails on tampered payload', async () => {
    const { publicKey, privateKey } = generateKeyPair();
    const message = 'original_payload';
    const tamperedMessage = 'tampered_payload';
    const signature = signMessage(message, privateKey);
    const testDID = 'did:sih26125:TEST001';

    const result = await verifyDIDSignature(testDID, tamperedMessage, signature, publicKey);
    assert.strictEqual(result.valid, false);
});
