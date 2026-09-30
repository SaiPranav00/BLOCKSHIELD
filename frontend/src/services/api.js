// Pure REST API Service for Hyperledger Fabric Backend (No Hardcoded Fallbacks)

const getDynamicBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

let currentApiUrl = getDynamicBaseUrl();

export const setApiBaseUrl = (url) => {
  currentApiUrl = url.endsWith('/') ? url.slice(0, -1) : url;
};

export const getApiBaseUrl = () => currentApiUrl;

async function request(endpoint, options = {}) {
  const url = `${currentApiUrl}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const startTime = performance.now();
    const res = await fetch(url, config);
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`HTTP Error ${res.status}: Endpoint ${endpoint} returned invalid JSON`);
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `HTTP Error ${res.status}`);
    }

    return { ...data, _latency: latency };
  } catch (err) {
    console.error(`[API Call Failed] ${endpoint}:`, err.message);
    throw err;
  }
}

// Health & System Monitor
export const checkHealth = async () => {
  const healthUrl = currentApiUrl.replace(/\/api$/, '/health');
  try {
    const startTime = performance.now();
    const res = await fetch(healthUrl);
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    const data = await res.json();
    return { ...data, isOnline: res.ok && data.status === 'UP', latency };
  } catch (err) {
    return { isOnline: false, status: 'OFFLINE', latency: 0 };
  }
};

// --- Identity & DID APIs ---
export const generateKeyPair = () => request('/dids/generate-keypair', { method: 'POST' });
export const createDID = (payload) => request('/dids', { method: 'POST', body: JSON.stringify(payload) });
export const getAllDIDs = () => request('/dids');
export const getDID = (did) => request(`/dids/${encodeURIComponent(did)}`);
export const updateDID = (did, payload) => request(`/dids/${encodeURIComponent(did)}`, { method: 'PUT', body: JSON.stringify(payload) });
export const revokeDID = (did) => request(`/dids/${encodeURIComponent(did)}/revoke`, { method: 'POST' });
export const verifyDIDSignature = (payload) => request('/dids/verify', { method: 'POST', body: JSON.stringify(payload) });

// --- RBAC APIs ---
export const assignRole = (payload) => request('/roles/assign', { method: 'POST', body: JSON.stringify(payload) });
export const getRole = (did) => request(`/roles/${encodeURIComponent(did)}`);

// --- NFT Asset Management APIs ---
export const mintNFT = (payload) => request('/nfts/mint', { method: 'POST', body: JSON.stringify(payload) });
export const getAllNFTs = () => request('/nfts');
export const getNFT = (tokenId) => request(`/nfts/${encodeURIComponent(tokenId)}`);
export const getAssetsByOwner = (did) => request(`/nfts/owner/${encodeURIComponent(did)}`);
export const allocateNFT = (tokenId, payload) => request(`/nfts/${encodeURIComponent(tokenId)}/allocate`, { method: 'POST', body: JSON.stringify(payload) });
export const transferNFT = (tokenId, payload) => request(`/nfts/${encodeURIComponent(tokenId)}/transfer`, { method: 'POST', body: JSON.stringify(payload) });
export const revokeNFT = (tokenId, payload) => request(`/nfts/${encodeURIComponent(tokenId)}/revoke`, { method: 'POST', body: JSON.stringify(payload) });
export const verifyNFT = (tokenId) => request(`/nfts/${encodeURIComponent(tokenId)}/verify`, { method: 'POST' });
export const getNFTHistory = (tokenId) => request(`/nfts/${encodeURIComponent(tokenId)}/history`);

// --- Audit APIs ---
export const getAuditLogs = () => request('/audit');
export const getAuditLogsByResource = (resourceId) => request(`/audit/${encodeURIComponent(resourceId)}`);

// --- Auth APIs ---
export const loginUser = (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const registerUserAcc = (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });

// --- Messaging & Task Delegation Channel APIs ---
export const getMessages = (role = 'USER', userDID = '') => request(`/messages?role=${encodeURIComponent(role)}&userDID=${encodeURIComponent(userDID)}`);
export const createMessageThread = (payload) => request('/messages', { method: 'POST', body: JSON.stringify(payload) });
export const replyToThread = (threadId, payload) => request(`/messages/${encodeURIComponent(threadId)}/reply`, { method: 'POST', body: JSON.stringify(payload) });
export const delegateTaskToManager = (threadId, payload) => request(`/messages/${encodeURIComponent(threadId)}/delegate`, { method: 'PUT', body: JSON.stringify(payload) });
export const executeThreadAction = (threadId, payload) => request(`/messages/${encodeURIComponent(threadId)}/action`, { method: 'POST', body: JSON.stringify(payload) });



