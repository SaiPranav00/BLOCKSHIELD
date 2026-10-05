// Sovereign API Service with Built-in Persistent Local Database Engine
// Operates 100% standalone without requiring backend, Docker, or external servers!

import { localDatabase } from './localDatabase';

const STORAGE_MODE_KEY = 'blockshield_database_mode';

// Mode: 'LOCAL_DB' (Default - Zero Backend Required) | 'BACKEND_API'
export const getDatabaseMode = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_MODE_KEY) || 'LOCAL_DB';
  }
  return 'LOCAL_DB';
};

export const setDatabaseMode = (mode) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    window.dispatchEvent(new Event('blockshield_mode_changed'));
  }
};

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
}

// =========================================================================
//  API EXPORTS: DUAL ROUTING (LOCAL DB DEFAULT OR REMOTE BACKEND)
// =========================================================================

// Health & System Monitor
export const checkHealth = async () => {
  const mode = getDatabaseMode();
  if (mode === 'LOCAL_DB') {
    const localHealth = await localDatabase.checkHealth();
    return {
      status: 'UP',
      isOnline: true,
      latency: localHealth.latency,
      mode: 'LOCAL_DB',
      storage: 'Persistent LocalStorage',
      timestamp: new Date().toISOString()
    };
  }

  const healthUrl = currentApiUrl.replace(/\/api$/, '/health');
  try {
    const startTime = performance.now();
    const res = await fetch(healthUrl);
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    const data = await res.json();
    return { ...data, isOnline: res.ok && data.status === 'UP', latency, mode: 'BACKEND_API' };
  } catch (err) {
    // Graceful automatic fallback to Local Database if backend is offline
    const localHealth = await localDatabase.checkHealth();
    return {
      status: 'UP',
      isOnline: true,
      latency: localHealth.latency,
      mode: 'LOCAL_DB',
      notice: 'Backend unreachable. Running on Local Database.',
      timestamp: new Date().toISOString()
    };
  }
};

// --- Identity & DID APIs ---
export const generateKeyPair = async () => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.generateKeyPair();
  }
  try {
    return await request('/dids/generate-keypair', { method: 'POST' });
  } catch {
    return localDatabase.generateKeyPair();
  }
};

export const createDID = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.createDID(payload);
  }
  try {
    return await request('/dids', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.createDID(payload);
  }
};

export const getAllDIDs = async () => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const dids = await localDatabase.getAllDIDs();
    return { success: true, data: dids };
  }
  try {
    return await request('/dids');
  } catch {
    const dids = await localDatabase.getAllDIDs();
    return { success: true, data: dids };
  }
};

export const getDID = async (did) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.getDID(did);
  }
  try {
    return await request(`/dids/${encodeURIComponent(did)}`);
  } catch {
    return localDatabase.getDID(did);
  }
};

export const updateDID = async (did, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.updateDID(did, payload);
  }
  try {
    return await request(`/dids/${encodeURIComponent(did)}`, { method: 'PUT', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.updateDID(did, payload);
  }
};

export const revokeDID = async (did) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.revokeDID(did);
  }
  try {
    return await request(`/dids/${encodeURIComponent(did)}/revoke`, { method: 'POST' });
  } catch {
    return localDatabase.revokeDID(did);
  }
};

export const verifyDIDSignature = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.verifyDIDSignature(payload);
  }
  try {
    return await request('/dids/verify', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.verifyDIDSignature(payload);
  }
};

// --- RBAC APIs ---
export const assignRole = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.assignRole(payload);
  }
  try {
    return await request('/roles/assign', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.assignRole(payload);
  }
};

export const getRole = async (did) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.getRole(did);
  }
  try {
    return await request(`/roles/${encodeURIComponent(did)}`);
  } catch {
    return localDatabase.getRole(did);
  }
};

export const approveUserRegistration = async (targetDID, options = {}) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return await localDatabase.approveUserRegistration(targetDID, options);
  }
  try {
    return await request('/identity/approve', { method: 'POST', body: JSON.stringify({ did: targetDID, ...options }) });
  } catch {
    return await localDatabase.approveUserRegistration(targetDID, options);
  }
};

export const denyUserRegistration = async (targetDID, options = {}) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return await localDatabase.denyUserRegistration(targetDID, options);
  }
  try {
    return await request('/identity/deny', { method: 'POST', body: JSON.stringify({ did: targetDID, ...options }) });
  } catch {
    return await localDatabase.denyUserRegistration(targetDID, options);
  }
};

// --- NFT Asset Management APIs ---
export const mintNFT = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.mintNFT(payload);
  }
  try {
    return await request('/nfts/mint', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.mintNFT(payload);
  }
};

export const getAllNFTs = async () => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const nfts = await localDatabase.getAllNFTs();
    return { success: true, data: nfts };
  }
  try {
    return await request('/nfts');
  } catch {
    const nfts = await localDatabase.getAllNFTs();
    return { success: true, data: nfts };
  }
};

export const getNFT = async (tokenId) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.getNFT(tokenId);
  }
  try {
    return await request(`/nfts/${encodeURIComponent(tokenId)}`);
  } catch {
    return localDatabase.getNFT(tokenId);
  }
};

export const getAssetsByOwner = async (did) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const assets = await localDatabase.getAssetsByOwner(did);
    return { success: true, data: assets };
  }
  try {
    return await request(`/nfts/owner/${encodeURIComponent(did)}`);
  } catch {
    const assets = await localDatabase.getAssetsByOwner(did);
    return { success: true, data: assets };
  }
};

export const allocateNFT = async (tokenId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.allocateNFT(tokenId, payload);
  }
  try {
    return await request(`/nfts/${encodeURIComponent(tokenId)}/allocate`, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.allocateNFT(tokenId, payload);
  }
};

export const transferNFT = async (tokenId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.transferNFT(tokenId, payload);
  }
  try {
    return await request(`/nfts/${encodeURIComponent(tokenId)}/transfer`, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.transferNFT(tokenId, payload);
  }
};

export const revokeNFT = async (tokenId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.revokeNFT(tokenId, payload);
  }
  try {
    return await request(`/nfts/${encodeURIComponent(tokenId)}/revoke`, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.revokeNFT(tokenId, payload);
  }
};

export const verifyNFT = async (tokenId) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.verifyNFT(tokenId);
  }
  try {
    return await request(`/nfts/${encodeURIComponent(tokenId)}/verify`, { method: 'POST' });
  } catch {
    return localDatabase.verifyNFT(tokenId);
  }
};

export const getNFTHistory = async (tokenId) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const history = await localDatabase.getNFTHistory(tokenId);
    return { success: true, data: history };
  }
  try {
    return await request(`/nfts/${encodeURIComponent(tokenId)}/history`);
  } catch {
    const history = await localDatabase.getNFTHistory(tokenId);
    return { success: true, data: history };
  }
};

// --- Audit APIs ---
export { isAssetLog, getLogCategoryDetails, notifyDataChange } from './localDatabase';

export const getAuditLogs = async (optionsOrRole) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const logs = await localDatabase.getAuditLogs(optionsOrRole);
    return { success: true, data: logs };
  }
  try {
    const query = optionsOrRole === 'AUDITOR' || optionsOrRole?.role === 'AUDITOR' ? '?role=AUDITOR' : '';
    return await request(`/audit${query}`);
  } catch {
    const logs = await localDatabase.getAuditLogs(optionsOrRole);
    return { success: true, data: logs };
  }
};

export const getAuditLogsByResource = async (resourceId, optionsOrRole) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const logs = await localDatabase.getAuditLogsByResource(resourceId, optionsOrRole);
    return { success: true, data: logs };
  }
  try {
    const query = optionsOrRole === 'AUDITOR' || optionsOrRole?.role === 'AUDITOR' ? '?role=AUDITOR' : '';
    return await request(`/audit/${encodeURIComponent(resourceId)}${query}`);
  } catch {
    const logs = await localDatabase.getAuditLogsByResource(resourceId, optionsOrRole);
    return { success: true, data: logs };
  }
};

// --- Transfer Request Workflow APIs ---
export const createTransferRequest = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.createTransferRequest(payload);
  }
  try {
    return await request('/transfers/request', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.createTransferRequest(payload);
  }
};

export const getPendingTransferRequests = async () => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const reqs = await localDatabase.getPendingTransferRequests();
    return { success: true, data: reqs };
  }
  try {
    return await request('/transfers/pending');
  } catch {
    const reqs = await localDatabase.getPendingTransferRequests();
    return { success: true, data: reqs };
  }
};

export const approveTransferRequest = async (requestId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.approveTransferRequest(requestId, payload);
  }
  try {
    return await request(`/transfers/${encodeURIComponent(requestId)}/approve`, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.approveTransferRequest(requestId, payload);
  }
};

export const rejectTransferRequest = async (requestId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.rejectTransferRequest(requestId, payload);
  }
  try {
    return await request(`/transfers/${encodeURIComponent(requestId)}/reject`, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.rejectTransferRequest(requestId, payload);
  }
};

export const getTransferRequest = async (requestId) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.getTransferRequest(requestId);
  }
  try {
    return await request(`/transfers/${encodeURIComponent(requestId)}`);
  } catch {
    return localDatabase.getTransferRequest(requestId);
  }
};

export const getTransferRequestsByDID = async (did) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const reqs = await localDatabase.getTransferRequestsByDID(did);
    return { success: true, data: reqs };
  }
  try {
    return await request(`/transfers/did/${encodeURIComponent(did)}`);
  } catch {
    const reqs = await localDatabase.getTransferRequestsByDID(did);
    return { success: true, data: reqs };
  }
};

// --- Auth APIs ---
export const loginUser = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.loginUser(payload);
  }
  try {
    return await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  } catch (err) {
    console.warn('[Remote login failed, falling back to local database]:', err.message);
    return localDatabase.loginUser(payload);
  }
};

export const registerUserAcc = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.registerUserAcc(payload);
  }
  try {
    return await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  } catch (err) {
    console.warn('[Remote register failed, falling back to local database]:', err.message);
    return localDatabase.registerUserAcc(payload);
  }
};

// --- Messaging & Task Delegation Channel APIs ---
export const getMessages = async (role = 'USER', userDID = '') => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    const threads = await localDatabase.getMessages(role, userDID);
    return { success: true, data: threads };
  }
  try {
    return await request(`/messages?role=${encodeURIComponent(role)}&userDID=${encodeURIComponent(userDID)}`);
  } catch {
    const threads = await localDatabase.getMessages(role, userDID);
    return { success: true, data: threads };
  }
};

export const createMessageThread = async (payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.createMessageThread(payload);
  }
  try {
    return await request('/messages', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.createMessageThread(payload);
  }
};

export const replyToThread = async (threadId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.replyToThread(threadId, payload);
  }
  try {
    return await request(`/messages/${encodeURIComponent(threadId)}/reply`, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.replyToThread(threadId, payload);
  }
};

export const delegateTaskToManager = async (threadId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.delegateTaskToManager(threadId, payload);
  }
  try {
    return await request(`/messages/${encodeURIComponent(threadId)}/delegate`, { method: 'PUT', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.delegateTaskToManager(threadId, payload);
  }
};

export const executeThreadAction = async (threadId, payload) => {
  if (getDatabaseMode() === 'LOCAL_DB') {
    return localDatabase.executeThreadAction(threadId, payload);
  }
  try {
    return await request(`/messages/${encodeURIComponent(threadId)}/action`, { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    return localDatabase.executeThreadAction(threadId, payload);
  }
};

// Direct Database Utilities
export const resetLocalDatabase = () => localDatabase.reset();
export const exportLocalDatabase = () => localDatabase.exportData();
