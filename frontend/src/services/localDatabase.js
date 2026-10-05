/**
 * BLOCKSHIELD Sovereign Local Database & Mock Ledger Engine
 * 
 * Provides 100% full-featured client-side persistence and blockchain ledger
 * simulation using browser localStorage. Zero backend, Docker, or external server required!
 * 
 * Features:
 * - Persistent Collections: users/DIDs, NFTs/assets, provenance history,
 *   transfer requests, audit logs, and message/task threads
 * - Real business logic matching Hyperledger Fabric chaincode + MongoDB
 * - Detailed forensic audit trail with cryptographic block numbers, hashes & policy proofs
 * - Cryptographic keypair generation & SHA256 integrity hashing
 * - Automatic genesis data seeding with demo and foundational accounts
 * - Interactive reset, export, and import support
 */

const STORAGE_KEY_PREFIX = 'blockshield_local_db_';
const DB_VERSION = 'v8';

const getKey = (collection) => `${STORAGE_KEY_PREFIX}${DB_VERSION}_${collection}`;

// Helper: Normalize and enforce authentic Indian names for all account usernames
export function normalizeIndianIdentity(user) {
  if (!user) return user;
  const username = (user.username || '').toUpperCase();
  const did = user.did || '';
  let updatedName = user.name;

  if (username === 'ADMIN001' || did === 'did:sih26125:ADMIN001' || updatedName === 'Marcus Chen') {
    updatedName = 'Rajesh Verma';
  } else if (username === 'MANAGER001' || did === 'did:sih26125:MANAGER001' || updatedName === 'Elena Vance' || updatedName === 'Daniel Foster') {
    updatedName = 'Ananya Sharma';
  } else if (username === 'USER001' || did === 'did:sih26125:USER001' || updatedName === 'Jordan Lee') {
    updatedName = 'Arjun Sharma';
  } else if (username === 'AUDITOR001' || did === 'did:sih26125:AUDITOR001') {
    updatedName = 'Priya Nair';
  } else if (username === 'N123456' || did === 'did:sih26125:N123456') {
    updatedName = 'Vikram Rao';
  } else if (username === 'SNEHA_ROY' || did === 'did:sih26125:SNEHA_ROY') {
    updatedName = 'Sneha Roy';
  }

  return {
    ...user,
    name: updatedName
  };
}

// Helper: Secure Random Hex
const randomHex = (length = 32) => {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

// Helper: Pseudo-SHA256 Hash for client-side provenance verification
export const computeHash = (data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hexPart = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hexPart}${randomHex(56)}`;
};

// Robust Storage Adapter supporting browser localStorage and server/test fallback
const memoryStorage = {};
const storageAdapter = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (_) {}
    return memoryStorage[key] || null;
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (_) {}
    memoryStorage[key] = String(value);
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (_) {}
    delete memoryStorage[key];
  }
};

// Helper to read collection
function getCollection(name) {
  try {
    const raw = storageAdapter.getItem(getKey(name));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (name === 'users' && Array.isArray(parsed)) {
      return parsed.map(normalizeIndianIdentity);
    }
    return parsed;
  } catch (err) {
    console.error(`[LocalDB] Error reading collection ${name}:`, err);
    return null;
  }
}

// Helper: Global CustomEvent Dispatcher for Real-Time UI Synchronization
export function notifyDataChange(detail = {}) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('blockshield:data-change', { detail }));
    } catch (_) {}
  }
}

// ─── Cross-Tab & Cross-Port Synchronizer Engine ─────────────────────────────
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('blockshield_bus');
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'SYNC') {
        notifyDataChange(event.data.detail);
      }
    };
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(STORAGE_KEY_PREFIX)) {
      notifyDataChange({ storageKey: e.key });
    }
  });
}

let lastLocalSyncTime = 0;
let isSyncing = false;

async function pushStateToServer(collectionName, data) {
  if (typeof window === 'undefined' || !window.fetch) return;
  try {
    const res = await fetch('/api/sync-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [collectionName]: data })
    });
    if (res.ok) {
      const resp = await res.json();
      if (resp && resp.timestamp) {
        lastLocalSyncTime = resp.timestamp;
      }
    }
  } catch (_) {}
}

export async function pullStateFromServer(force = false) {
  if (typeof window === 'undefined' || !window.fetch || isSyncing) return;
  try {
    isSyncing = true;
    const res = await fetch('/api/sync-state');
    if (!res.ok) return;
    const serverState = await res.json();
    if (!serverState || !serverState._syncTimestamp) return;

    if (force || serverState._syncTimestamp > lastLocalSyncTime) {
      let changed = false;
      const collections = ['users', 'nfts', 'audit_logs', 'transfer_requests', 'message_threads', 'nft_history'];
      for (const col of collections) {
        if (serverState[col]) {
          const key = getKey(col);
          const currentVal = storageAdapter.getItem(key);
          const incomingVal = JSON.stringify(serverState[col]);
          if (currentVal !== incomingVal) {
            storageAdapter.setItem(key, incomingVal);
            changed = true;
          }
        }
      }
      lastLocalSyncTime = serverState._syncTimestamp;
      if (changed) {
        notifyDataChange({ source: 'cross-port-sync' });
      }
    }
  } catch (_) {}
  finally {
    isSyncing = false;
  }
}

// Auto-initialize background synchronization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    pullStateFromServer(true);
  }, 100);

  // Poll for changes from other port every 1200ms
  setInterval(() => {
    pullStateFromServer();
  }, 1200);

  // Trigger sync on tab focus or visibility change
  window.addEventListener('focus', () => pullStateFromServer());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pullStateFromServer();
    }
  });
}

// Helper to save collection and broadcast state change across all tabs and ports
function saveCollection(name, data) {
  try {
    let toSave = data;
    if (name === 'users' && Array.isArray(data)) {
      toSave = data.map(normalizeIndianIdentity);
    }
    storageAdapter.setItem(getKey(name), JSON.stringify(toSave));
    notifyDataChange({ collection: name });
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'SYNC', detail: { collection: name } });
      } catch (_) {}
    }
    pushStateToServer(name, toSave);
  } catch (err) {
    console.error(`[LocalDB] Error saving collection ${name}:`, err);
  }
}

// --- INITIAL GENESIS SEED DATA ---
const SEED_USERS = [
  {
    did: 'did:sih26125:ADMIN001',
    username: 'ADMIN001',
    name: 'Rajesh Verma',
    role: 'ADMIN',
    password: 'password123',
    status: 'ACTIVE',
    department: 'Executive Governance',
    userCategory: 'DEFENCE',
    idProofType: 'GOVERNMENT_ID',
    idProofNumber: 'GOV-IND-0001',
    orgProof: { serviceId: 'BEL-EXEC-001', department: 'Executive Governance' },
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3f7y9mP...ADMIN\n-----END PUBLIC KEY-----',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    did: 'did:sih26125:MANAGER001',
    username: 'MANAGER001',
    name: 'Ananya Sharma',
    role: 'MANAGER',
    password: 'password123',
    status: 'ACTIVE',
    department: 'R&D',
    userCategory: 'DEFENCE',
    idProofType: 'GOVERNMENT_ID',
    idProofNumber: 'GOV-IND-4421',
    orgProof: { serviceId: 'BEL-MGR-001', department: 'R&D Operations' },
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1k90bW...MANAGER\n-----END PUBLIC KEY-----',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 9).toISOString()
  },
  {
    did: 'did:sih26125:AUDITOR001',
    username: 'AUDITOR001',
    name: 'Priya Nair',
    role: 'AUDITOR',
    password: 'password123',
    status: 'ACTIVE',
    department: 'Compliance & Audit',
    userCategory: 'SOFTWARE',
    idProofType: 'AADHAAR',
    idProofNumber: 'AADHAAR-8822-4411-9900',
    orgProof: { employeeId: 'TECH-AUD-001', companyEmail: 'auditor@blockshield.bel.in' },
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7b62xZ...AUDITOR\n-----END PUBLIC KEY-----',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 8).toISOString()
  },
  {
    did: 'did:sih26125:USER001',
    username: 'USER001',
    name: 'Arjun Sharma',
    role: 'USER',
    password: 'password123',
    status: 'ACTIVE',
    department: 'R&D',
    userCategory: 'DEFENCE',
    idProofType: 'GOVERNMENT_ID',
    idProofNumber: 'GOV-IND-7782',
    orgProof: { serviceId: 'BEL-ENG-014', department: 'R&D' },
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9x34cQ...USER\n-----END PUBLIC KEY-----',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    did: 'did:sih26125:N123456',
    username: 'N123456',
    name: 'Vikram Rao',
    role: 'USER',
    password: 'password123',
    status: 'ACTIVE',
    department: 'R&D',
    userCategory: 'DEFENCE',
    idProofType: 'GOVERNMENT_ID',
    idProofNumber: 'GOV-IND-9912',
    orgProof: { serviceId: 'BEL-SRV-9912', department: 'Radar Systems' },
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4v81mP...N123456\n-----END PUBLIC KEY-----',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    did: 'did:sih26125:SNEHA_ROY',
    username: 'SNEHA_ROY',
    name: 'Sneha Roy',
    role: 'USER',
    password: 'password123',
    status: 'PENDING_APPROVAL',
    department: 'Avionics Division',
    userCategory: 'DEFENCE',
    idProofType: 'GOVERNMENT_ID',
    idProofNumber: 'GOV-IND-5521',
    orgProof: { serviceId: 'BEL-AVN-2026', department: 'Avionics Division', authCode: 'BEL-SEC-2026' },
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9a77xb...SNEHA\n-----END PUBLIC KEY-----',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

const SEED_NFTS = [
  {
    tokenId: 'NFT-1001',
    assetId: 'BEL-RF-00421',
    assetName: 'RF Signal Analyzer',
    assetType: 'TESTING_EQUIPMENT',
    legalOwner: 'BEL',
    custodian: 'did:sih26125:N123456',
    ownerDID: 'did:sih26125:N123456',
    department: 'R&D',
    location: 'R&D Lab 1',
    metadata: JSON.stringify({ frequencyRange: '9kHz - 6GHz', calibrationDue: '2027-01', model: 'BEL-SA-600' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    tokenId: 'NFT-1002',
    assetId: 'BEL-WS-0077',
    assetName: 'Engineering Workstation',
    assetType: 'HARDWARE',
    legalOwner: 'BEL',
    custodian: 'did:sih26125:USER001',
    ownerDID: 'did:sih26125:USER001',
    department: 'R&D',
    location: 'Building B, Floor 2',
    metadata: JSON.stringify({ ram: '128GB', gpu: 'RTX A6000', processor: 'AMD Threadripper' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    tokenId: 'NFT-1003',
    assetId: 'BEL-HSM-902',
    assetName: 'Hardware Security Module (HSM)',
    assetType: 'SECURITY',
    legalOwner: 'BEL',
    custodian: 'did:sih26125:ADMIN001',
    ownerDID: 'did:sih26125:ADMIN001',
    department: 'Executive Governance',
    location: 'Secure Vault 4',
    metadata: JSON.stringify({ fipsLevel: 'FIPS 140-3 Level 4', certId: 'HSM-BEL-992' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    tokenId: 'NFT-1004',
    assetId: 'BEL-DSO-0104',
    assetName: 'Digital Oscilloscope',
    assetType: 'TESTING_EQUIPMENT',
    legalOwner: 'Bharat Electronics Limited',
    custodian: 'did:sih26125:MANAGER001',
    ownerDID: 'did:sih26125:MANAGER001',
    department: 'R&D Operations',
    location: 'Signal Testing Lab 2',
    metadata: JSON.stringify({ description: 'Electronic signal measurement', bandwidth: '2 GHz', channels: 4, sampleRate: '10 GSa/s', model: 'BEL-DSO-2000' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    tokenId: 'NFT-1005',
    assetId: 'BEL-SPA-0105',
    assetName: 'Spectrum Analyzer',
    assetType: 'TESTING_EQUIPMENT',
    legalOwner: 'Bharat Electronics Limited',
    custodian: 'did:sih26125:N123456',
    ownerDID: 'did:sih26125:N123456',
    department: 'Radar Systems',
    location: 'RF Calibration Facility',
    metadata: JSON.stringify({ description: 'Frequency-domain signal analysis', frequencyRange: '10 Hz - 44 GHz', resolutionBW: '1 Hz', model: 'BEL-SPA-440' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 5.5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5.5).toISOString()
  },
  {
    tokenId: 'NFT-1006',
    assetId: 'BEL-SCD-0106',
    assetName: 'Secure Communication Device',
    assetType: 'COMMUNICATION',
    legalOwner: 'Bharat Electronics Limited',
    custodian: 'did:sih26125:ADMIN001',
    ownerDID: 'did:sih26125:ADMIN001',
    department: 'Executive Governance',
    location: 'Command Communications Center',
    metadata: JSON.stringify({ description: 'Secure voice/data communication equipment', encryption: 'Post-Quantum Sovereign Cryptography', clearance: 'RESTRICTED-DEFENCE' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    tokenId: 'NFT-1007',
    assetId: 'BEL-NSA-0107',
    assetName: 'Network Security Appliance',
    assetType: 'SECURITY',
    legalOwner: 'Bharat Electronics Limited',
    custodian: 'did:sih26125:MANAGER001',
    ownerDID: 'did:sih26125:MANAGER001',
    department: 'Cyber Security Ops',
    location: 'Secure Data Center Tier 4',
    metadata: JSON.stringify({ description: 'Controlled network/security infrastructure', throughput: '100 Gbps', feature: 'Hardware Cryptographic Deep Packet Inspection' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 4.5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4.5).toISOString()
  },
  {
    tokenId: 'NFT-1008',
    assetId: 'BEL-EDK-0108',
    assetName: 'Embedded Development Kit',
    assetType: 'HARDWARE',
    legalOwner: 'Bharat Electronics Limited',
    custodian: 'did:sih26125:USER001',
    ownerDID: 'did:sih26125:USER001',
    department: 'Avionics Division',
    location: 'Avionics Firmware Lab 4',
    metadata: JSON.stringify({ description: 'Hardware used for firmware/prototype development', processor: 'Multi-Core RISC-V SoC', target: 'Defence Avionics Firmware' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 3.5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3.5).toISOString()
  },
  {
    tokenId: 'NFT-1009',
    assetId: 'BEL-TIC-0109',
    assetName: 'Thermal Imaging Camera',
    assetType: 'TESTING_EQUIPMENT',
    legalOwner: 'Bharat Electronics Limited',
    custodian: 'did:sih26125:N123456',
    ownerDID: 'did:sih26125:N123456',
    department: 'Optronics & Inspection',
    location: 'Optronics Testing Facility',
    metadata: JSON.stringify({ description: 'Inspection and thermal analysis', resolution: '1024x768 Thermal Array', sensitivity: '< 20 mK' }),
    creatorDID: 'did:sih26125:ADMIN001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

const SEED_NFT_HISTORY = {
  'NFT-1001': [
    {
      txId: '0x9a8f27b401c3d9e87123aa45bf67cc89d1234567890abcdef1234567890abcde',
      timestamp: String(Math.floor((Date.now() - 86400000 * 5) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1001',
        assetName: 'RF Signal Analyzer',
        assetType: 'TESTING_EQUIPMENT',
        legalOwner: 'BEL',
        custodian: 'did:sih26125:ADMIN001',
        ownerDID: 'did:sih26125:ADMIN001',
        department: 'Executive Governance',
        location: 'HQ Central Store',
        status: 'ACTIVE'
      }
    },
    {
      txId: '0x3c21a4f9810b4de21782bc34df987110e543210987fedcba0987654321fedcba',
      timestamp: String(Math.floor((Date.now() - 86400000 * 2) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1001',
        assetName: 'RF Signal Analyzer',
        assetType: 'TESTING_EQUIPMENT',
        legalOwner: 'BEL',
        custodian: 'did:sih26125:N123456',
        ownerDID: 'did:sih26125:N123456',
        department: 'R&D',
        location: 'R&D Lab 1',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1002': [
    {
      txId: '0x7e10b42c98a7612f0099887766554433221100ffeeddccbbaa99887766554433',
      timestamp: String(Math.floor((Date.now() - 86400000 * 4) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1002',
        assetName: 'Engineering Workstation',
        assetType: 'HARDWARE',
        legalOwner: 'BEL',
        custodian: 'did:sih26125:USER001',
        ownerDID: 'did:sih26125:USER001',
        department: 'R&D',
        location: 'Building B, Floor 2',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1003': [
    {
      txId: '0x554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766',
      timestamp: String(Math.floor((Date.now() - 86400000 * 7) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1003',
        assetName: 'Hardware Security Module (HSM)',
        assetType: 'SECURITY',
        legalOwner: 'BEL',
        custodian: 'did:sih26125:ADMIN001',
        ownerDID: 'did:sih26125:ADMIN001',
        department: 'Executive Governance',
        location: 'Secure Vault 4',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1004': [
    {
      txId: '0x1004aa99887766554433221100ffeeddccbbaa99887766554433221100ffeedd',
      timestamp: String(Math.floor((Date.now() - 86400000 * 6) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1004',
        assetName: 'Digital Oscilloscope',
        assetType: 'TESTING_EQUIPMENT',
        legalOwner: 'Bharat Electronics Limited',
        custodian: 'did:sih26125:MANAGER001',
        ownerDID: 'did:sih26125:MANAGER001',
        department: 'R&D Operations',
        location: 'Signal Testing Lab 2',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1005': [
    {
      txId: '0x1005bb88aa223344556677889900aabbccddeeff00112233445566778899aabbcc',
      timestamp: String(Math.floor((Date.now() - 86400000 * 5.5) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1005',
        assetName: 'Spectrum Analyzer',
        assetType: 'TESTING_EQUIPMENT',
        legalOwner: 'Bharat Electronics Limited',
        custodian: 'did:sih26125:N123456',
        ownerDID: 'did:sih26125:N123456',
        department: 'Radar Systems',
        location: 'RF Calibration Facility',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1006': [
    {
      txId: '0x1006cc77bb3344556677889900aabbccddeeff00112233445566778899aabbcc',
      timestamp: String(Math.floor((Date.now() - 86400000 * 5) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1006',
        assetName: 'Secure Communication Device',
        assetType: 'COMMUNICATION',
        legalOwner: 'Bharat Electronics Limited',
        custodian: 'did:sih26125:ADMIN001',
        ownerDID: 'did:sih26125:ADMIN001',
        department: 'Executive Governance',
        location: 'Command Communications Center',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1007': [
    {
      txId: '0x1007dd66cc44556677889900aabbccddeeff00112233445566778899aabbcc',
      timestamp: String(Math.floor((Date.now() - 86400000 * 4.5) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1007',
        assetName: 'Network Security Appliance',
        assetType: 'SECURITY',
        legalOwner: 'Bharat Electronics Limited',
        custodian: 'did:sih26125:MANAGER001',
        ownerDID: 'did:sih26125:MANAGER001',
        department: 'Cyber Security Ops',
        location: 'Secure Data Center Tier 4',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1008': [
    {
      txId: '0x1008ee55dd556677889900aabbccddeeff00112233445566778899aabbcc',
      timestamp: String(Math.floor((Date.now() - 86400000 * 3.5) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1008',
        assetName: 'Embedded Development Kit',
        assetType: 'HARDWARE',
        legalOwner: 'Bharat Electronics Limited',
        custodian: 'did:sih26125:USER001',
        ownerDID: 'did:sih26125:USER001',
        department: 'Avionics Division',
        location: 'Avionics Firmware Lab 4',
        status: 'ACTIVE'
      }
    }
  ],
  'NFT-1009': [
    {
      txId: '0x1009ff44ee6677889900aabbccddeeff00112233445566778899aabbcc',
      timestamp: String(Math.floor((Date.now() - 86400000 * 3) / 1000)),
      isDelete: false,
      nft: {
        tokenId: 'NFT-1009',
        assetName: 'Thermal Imaging Camera',
        assetType: 'TESTING_EQUIPMENT',
        legalOwner: 'Bharat Electronics Limited',
        custodian: 'did:sih26125:N123456',
        ownerDID: 'did:sih26125:N123456',
        department: 'Optronics & Inspection',
        location: 'Optronics Testing Facility',
        status: 'ACTIVE'
      }
    }
  ]
};

const SEED_TRANSFER_REQUESTS = [
  {
    requestId: 'REQ-1001',
    tokenId: 'NFT-1001',
    fromDID: 'did:sih26125:N123456',
    toDID: 'did:sih26125:USER001',
    status: 'PENDING',
    reason: 'Field testing handover for radar subsystem calibration',
    approverDID: '',
    rejectionReason: '',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

const SEED_AUDIT_LOGS = [
  {
    eventId: 'EVT-SEC-2026-GEN001',
    blockNumber: 1040,
    txId: '0x9a8f27b401c3d9e87123aa45bf67cc89d1234567890abcdef1234567890abcde',
    actorDID: 'did:sih26125:ADMIN001',
    actorName: 'Rajesh Verma',
    actorRole: 'ADMIN',
    action: 'SYSTEM_BOOTSTRAP',
    resourceId: 'BLOCKSHIELD-ROOT',
    result: 'ALLOWED',
    policyRule: 'BEL-GOV-ZERO-TRUST-GENESIS',
    timestamp: String(Math.floor((Date.now() - 86400000 * 10) / 1000)),
    details: 'Hyperledger Fabric sovereign local ledger initialized with zero-trust RBAC governance. Genesis block #1040 committed with SHA-256 Merkle root. Node endorsement established with BEL Org1 and Org2 peers.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in', 'peer0.org2.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { genesisVersion: '2.5.0', standard: 'W3C-DID-v1.0' },
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-DID001',
    blockNumber: 1041,
    txId: '0x7e10b42c98a7612f0099887766554433221100ffeeddccbbaa99887766554433',
    actorDID: 'did:sih26125:ADMIN001',
    actorName: 'Rajesh Verma',
    actorRole: 'ADMIN',
    action: 'CREATE_DID',
    resourceId: 'did:sih26125:ADMIN001',
    result: 'ALLOWED',
    policyRule: 'BEL-DID-ISSUANCE-POLICY-01',
    timestamp: String(Math.floor((Date.now() - 86400000 * 9) / 1000)),
    details: 'Administrator identity issued under Executive Governance protocol. W3C DID document generated with RSA-2048 public key. Status: ACTIVE. Access role ADMIN provisioned with root platform management permissions.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { did: 'did:sih26125:ADMIN001', role: 'ADMIN', department: 'Executive Governance', userCategory: 'DEFENCE' },
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-DID002',
    blockNumber: 1042,
    txId: '0x3c21a4f9810b4de21782bc34df987110e543210987fedcba0987654321fedcba',
    actorDID: 'did:sih26125:ADMIN001',
    actorName: 'Rajesh Verma',
    actorRole: 'ADMIN',
    action: 'CREATE_DID',
    resourceId: 'did:sih26125:MANAGER001',
    result: 'ALLOWED',
    policyRule: 'BEL-DID-ISSUANCE-POLICY-01',
    timestamp: String(Math.floor((Date.now() - 86400000 * 8) / 1000)),
    details: 'Asset Operations Manager Ananya Sharma (did:sih26125:MANAGER001) provisioned in R&D Operations department. Credentials verified via Government ID (GOV-IND-4421). Delegated approval authority over hardware allocations.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { did: 'did:sih26125:MANAGER001', role: 'MANAGER', department: 'R&D', userCategory: 'DEFENCE' },
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-DID003',
    blockNumber: 1043,
    txId: '0xbb88aa223344556677889900aabbccddeeff00112233445566778899aabbccdd',
    actorDID: 'did:sih26125:ADMIN001',
    actorName: 'Rajesh Verma',
    actorRole: 'ADMIN',
    action: 'CREATE_DID',
    resourceId: 'did:sih26125:AUDITOR001',
    result: 'ALLOWED',
    policyRule: 'BEL-DID-ISSUANCE-POLICY-01',
    timestamp: String(Math.floor((Date.now() - 86400000 * 7.5) / 1000)),
    details: 'Auditor Priya Nair (did:sih26125:AUDITOR001) provisioned with read-only verification rights for asset custody and provenance records.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { did: 'did:sih26125:AUDITOR001', role: 'AUDITOR', department: 'Compliance & Audit', userCategory: 'SOFTWARE' },
    createdAt: new Date(Date.now() - 86400000 * 7.5).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-NFT003',
    blockNumber: 1044,
    txId: '0x554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766',
    actorDID: 'did:sih26125:ADMIN001',
    actorName: 'Rajesh Verma',
    actorRole: 'ADMIN',
    action: 'MINT_NFT',
    resourceId: 'NFT-1003',
    result: 'ALLOWED',
    policyRule: 'BEL-ASSET-MINT-GOV-01',
    timestamp: String(Math.floor((Date.now() - 86400000 * 7) / 1000)),
    details: 'Tokenized sovereign security asset "Hardware Security Module (HSM)". Class: SECURITY. Custodian: did:sih26125:ADMIN001. Location: Secure Vault 4.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { tokenId: 'NFT-1003', assetName: 'Hardware Security Module (HSM)', assetType: 'SECURITY', location: 'Secure Vault 4' },
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-NFT001',
    blockNumber: 1045,
    txId: '0x99aa88bb77cc66dd55ee44ff33aa22bb11cc00dd99ee88ff77aa66bb55cc44dd',
    actorDID: 'did:sih26125:ADMIN001',
    actorName: 'Rajesh Verma',
    actorRole: 'ADMIN',
    action: 'MINT_NFT',
    resourceId: 'NFT-1001',
    result: 'ALLOWED',
    policyRule: 'BEL-ASSET-MINT-GOV-01',
    timestamp: String(Math.floor((Date.now() - 86400000 * 5) / 1000)),
    details: 'Tokenized digital equipment "RF Signal Analyzer" (Registry: BEL-RF-00421). Asset Class: TESTING_EQUIPMENT. Legal Owner: Bharat Electronics Limited. Initial custody: did:sih26125:ADMIN001. Frequency: 9kHz - 6GHz.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in', 'peer0.org2.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { tokenId: 'NFT-1001', assetName: 'RF Signal Analyzer', assetType: 'TESTING_EQUIPMENT', location: 'R&D Lab 1' },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-NFT002',
    blockNumber: 1046,
    txId: '0x7e10b42c98a7612f0099887766554433221100ffeeddccbbaa99887766554433',
    actorDID: 'did:sih26125:ADMIN001',
    actorName: 'Rajesh Verma',
    actorRole: 'ADMIN',
    action: 'MINT_NFT',
    resourceId: 'NFT-1002',
    result: 'ALLOWED',
    policyRule: 'BEL-ASSET-MINT-GOV-01',
    timestamp: String(Math.floor((Date.now() - 86400000 * 4) / 1000)),
    details: 'Tokenized engineering asset "Engineering Workstation". Asset Class: HARDWARE. Assigned to R&D division. Custodian: did:sih26125:USER001.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { tokenId: 'NFT-1002', assetName: 'Engineering Workstation', assetType: 'HARDWARE', location: 'Building B, Floor 2' },
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-ALC001',
    blockNumber: 1047,
    txId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    actorDID: 'did:sih26125:MANAGER001',
    actorName: 'Ananya Sharma',
    actorRole: 'MANAGER',
    action: 'ALLOCATE_NFT',
    resourceId: 'NFT-1001',
    result: 'ALLOWED',
    policyRule: 'BEL-CUSTODY-ALLOCATION-02',
    timestamp: String(Math.floor((Date.now() - 86400000 * 2) / 1000)),
    details: 'Operations Manager executed custody allocation for asset "RF Signal Analyzer" (NFT-1001). Reassigned custody from central store to Vikram Rao (did:sih26125:N123456) in Radar Systems Division. Physical location: R&D Lab 1.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { tokenId: 'NFT-1001', previousCustodian: 'did:sih26125:ADMIN001', newCustodian: 'did:sih26125:N123456' },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-TRF001',
    blockNumber: 1048,
    txId: '0x44556677889900aabbccddeeff00112233445566778899aabbccddeeff001122',
    actorDID: 'did:sih26125:N123456',
    actorName: 'Vikram Rao',
    actorRole: 'USER',
    action: 'TRANSFER_REQUEST_CREATE',
    resourceId: 'REQ-1001',
    result: 'ALLOWED',
    policyRule: 'BEL-CUSTODY-TRANSFER-GATEWAY',
    timestamp: String(Math.floor((Date.now() - 3600000 * 2) / 1000)),
    details: 'Transfer request submitted for asset "RF Signal Analyzer" (NFT-1001) from Vikram Rao to Arjun Sharma (USER001). Reason: Field testing handover for radar subsystem calibration.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { requestId: 'REQ-1001', tokenId: 'NFT-1001', fromDID: 'did:sih26125:N123456', toDID: 'did:sih26125:USER001' },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    eventId: 'EVT-SEC-2026-SEC001',
    blockNumber: 1049,
    txId: '0xfeeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100',
    actorDID: 'did:sih26125:USER001',
    actorName: 'Arjun Sharma',
    actorRole: 'USER',
    action: 'ACCESS_CHECK',
    resourceId: 'VAULT-SEC-01',
    result: 'DENIED',
    policyRule: 'BEL-SECURITY-ENCLAVE-GUARD',
    timestamp: String(Math.floor((Date.now() - 3600000 * 1) / 1000)),
    details: 'Unauthorized attempt to query Sovereign Root Key Enclave (VAULT-SEC-01). Actor clearance level 2 does not meet required Level 5. Policy BEL-SECURITY-ENCLAVE-GUARD triggered automated block.',
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED'
    },
    payload: { targetEnclave: 'VAULT-SEC-01', requiredClearance: 'Level 5', actorClearance: 'Level 2' },
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
  }
];

const SEED_MESSAGE_THREADS = [
  {
    id: 'thread-general',
    category: 'GENERAL_CHAT',
    status: 'ACTIVE',
    senderDID: 'did:sih26125:ADMIN001',
    senderName: 'Rajesh Verma',
    senderRole: 'ADMIN',
    targetRole: 'ALL',
    title: 'Public Channel (General Broadcast)',
    details: {},
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      {
        msgId: 'msg-seed-1',
        senderDID: 'did:sih26125:ADMIN001',
        senderName: 'Rajesh Verma',
        senderRole: 'ADMIN',
        recipientTarget: 'EVERYONE',
        content: 'Welcome to the BLOCKSHIELD Sovereign Ledger Network. All platform members can coordinate and collaborate here.',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        msgId: 'msg-seed-2',
        senderDID: 'did:sih26125:MANAGER001',
        senderName: 'Ananya Sharma',
        senderRole: 'MANAGER',
        recipientTarget: 'EVERYONE',
        content: 'Asset Operations desk online. Ready for asset allocation, verification, and transfer request reviews.',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
  {
    id: 'thread-transfer-1001',
    category: 'DELEGATE_ALLOCATE',
    status: 'PENDING',
    senderDID: 'did:sih26125:N123456',
    senderName: 'Vikram Rao',
    senderRole: 'USER',
    targetRole: 'MANAGER',
    assignedManagerDID: 'did:sih26125:MANAGER001',
    title: 'Handover Request: RF Signal Analyzer (NFT-1001)',
    details: {
      requestedTokenId: 'NFT-1001',
      targetOwnerDID: 'did:sih26125:USER001',
      reason: 'Field testing handover for radar subsystem calibration'
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    messages: [
      {
        msgId: 'msg-seed-3',
        senderDID: 'did:sih26125:N123456',
        senderName: 'Vikram Rao',
        senderRole: 'USER',
        recipientTarget: 'MANAGER',
        content: 'Requesting asset transfer of RF Signal Analyzer (NFT-1001) to Arjun Sharma (USER001) for radar subsystem testing.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ]
  }
];

// Initialize database with seed data if empty
export function initLocalDatabase(forceReset = false) {
  // 1. In-place localStorage sanitization of any stale cached strings
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && (k.startsWith('blockshield_') || k.startsWith('sih_'))) {
          let val = window.localStorage.getItem(k);
          if (val && (val.includes('Marcus Chen') || val.includes('Elena Vance') || val.includes('Jordan Lee') || val.includes('Daniel Foster'))) {
            val = val.replaceAll('Marcus Chen', 'Rajesh Verma')
                     .replaceAll('Elena Vance', 'Ananya Sharma')
                     .replaceAll('Daniel Foster', 'Ananya Sharma')
                     .replaceAll('Jordan Lee', 'Arjun Sharma');
            window.localStorage.setItem(k, val);
          }
        }
      }
    } catch (_) {}
  }

  const initKey = `${STORAGE_KEY_PREFIX}initialized_${DB_VERSION}`;
  const initialized = storageAdapter.getItem(initKey);
  if (!initialized || forceReset) {
    saveCollection('users', SEED_USERS);
    saveCollection('nfts', SEED_NFTS);
    saveCollection('nft_history', SEED_NFT_HISTORY);
    saveCollection('transfer_requests', SEED_TRANSFER_REQUESTS);
    saveCollection('audit_logs', SEED_AUDIT_LOGS);
    saveCollection('message_threads', SEED_MESSAGE_THREADS);
    storageAdapter.setItem(initKey, 'true');
    console.log(`[BlockShield Local DB] Initialized collections with seed state (${DB_VERSION}).`);
  } else {
    // Migration sync: Ensure all users have authentic Indian names
    const currentUsers = getCollection('users') || [];
    const sanitizedUsers = currentUsers.map(normalizeIndianIdentity);
    saveCollection('users', sanitizedUsers);

    // Migration sync: Ensure all seed NFTs exist in current storage
    const currentNFTs = getCollection('nfts') || [];
    let updated = false;
    for (const seedAsset of SEED_NFTS) {
      if (!currentNFTs.some(a => a.tokenId === seedAsset.tokenId)) {
        currentNFTs.push(seedAsset);
        updated = true;
      }
    }
    if (updated) {
      saveCollection('nfts', currentNFTs);
      const currentHistory = getCollection('nft_history') || {};
      for (const [tokenId, hist] of Object.entries(SEED_NFT_HISTORY)) {
        if (!currentHistory[tokenId]) {
          currentHistory[tokenId] = hist;
        }
      }
      saveCollection('nft_history', currentHistory);
      console.log(`[BlockShield Local DB] Synchronized additional sovereign assets into local ledger.`);
    }
  }
}

// Auto-run initialization
initLocalDatabase();

// Helper to determine if an audit log is strictly related to an asset
export function isAssetLog(log) {
  if (!log) return false;
  const action = (log.action || '').toUpperCase();
  const resourceId = (log.resourceId || '').toUpperCase();

  // If resourceId is an asset, hardware token, or asset custody transfer request
  if (resourceId.startsWith('NFT-') || resourceId.startsWith('AST-') || resourceId.startsWith('REQ-')) {
    return true;
  }

  // Check action keywords for asset operations
  const assetKeywords = [
    'NFT', 'ASSET', 'ALLOCAT', 'TRANSFER', 'CUSTODY', 'PROVENANCE', 'MINT', 'BURN'
  ];
  if (assetKeywords.some(keyword => action.includes(keyword))) {
    return true;
  }

  // Check structured payload
  if (log.payload) {
    if (log.payload.tokenId || log.payload.assetName || log.payload.requestedTokenId || log.payload.assetType) {
      return true;
    }
  }

  // Check fiveWs metadata
  const resourceType = log.fiveWs?.what?.resourceType || '';
  if (resourceType.toLowerCase().includes('asset') || resourceType.toLowerCase().includes('equipment') || resourceType.toLowerCase().includes('physical')) {
    return true;
  }

  return false;
}

// Helper to derive meaningful semantic categories, badges, and styling for audit logs
export function getLogCategoryDetails(log) {
  if (!log) {
    return {
      key: 'IDENTITY_SECURITY',
      label: 'Identity & Security',
      badge: 'IDENTITY & ACCESS',
      color: '#1d4ed8',
      bg: '#eff6ff',
      border: '#bfdbfe'
    };
  }

  // 1. Asset Operations
  if (isAssetLog(log)) {
    return {
      key: 'ASSET',
      label: 'Asset Operations',
      badge: 'ASSET OPERATION',
      color: '#047857',
      bg: '#ecfdf5',
      border: '#a7f3d0'
    };
  }

  const action = (log.action || '').toUpperCase();
  const resourceId = (log.resourceId || '').toUpperCase();

  // 2. Genesis & Ledger Governance
  if (action === 'SYSTEM_BOOTSTRAP' || action === 'INITIALIZE_LEDGER' || action === 'GENESIS' || resourceId === 'BLOCKSHIELD-ROOT') {
    return {
      key: 'GENESIS',
      label: 'Genesis Governance',
      badge: 'GENESIS GOVERNANCE',
      color: '#6d28d9',
      bg: '#f5f3ff',
      border: '#ddd6fe'
    };
  }

  // 3. Security, Authentication & Access Verification
  if (action.includes('LOGIN') || action.includes('ACCESS') || action.includes('SECURITY') || action.includes('AUTH') || action.includes('POLICY') || action.includes('KEYPAIR')) {
    return {
      key: 'SECURITY',
      label: 'Security & Access',
      badge: 'SECURITY & ACCESS',
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a'
    };
  }

  // 4. Identity Management & Role Assignments
  return {
    key: 'IDENTITY',
    label: 'Identity & Access',
    badge: 'IDENTITY & ACCESS',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe'
  };
}

// Comprehensive Forensic Audit Logger & Cryptographic Event Anchor
export function recordAuditLog(actorDID, action, resourceId, result = 'ALLOWED', details = '', extra = {}) {
  const logs = getCollection('audit_logs') || [];
  const timestampSec = String(Math.floor(Date.now() / 1000));
  const blockNum = 1045 + logs.length;
  const txHash = computeHash({ actorDID, action, resourceId, timestampSec, nonce: randomHex(12) });

  // Resolve actor identity
  const users = getCollection('users') || [];
  const actorUser = users.find(u => u.did === actorDID || u.username === actorDID);
  const actorRole = actorUser ? actorUser.role : (actorDID?.includes('ADMIN') ? 'ADMIN' : actorDID?.includes('MANAGER') ? 'MANAGER' : actorDID?.includes('AUDITOR') ? 'AUDITOR' : 'USER');
  const actorName = actorUser ? (actorUser.name || actorUser.username) : actorDID.replace('did:sih26125:', '');

  const department = actorUser?.department || extra.department || (actorRole === 'ADMIN' ? 'Executive Governance' : actorRole === 'MANAGER' ? 'R&D Operations' : actorRole === 'AUDITOR' ? 'Compliance & Audit' : 'Radar Systems Division');
  const clearance = actorRole === 'ADMIN' ? 'Level 5 (Root Sovereign Authority)' : actorRole === 'MANAGER' ? 'Level 4 (Departmental Signoff)' : actorRole === 'AUDITOR' ? 'Level 4 (Regulatory Auditor)' : 'Level 3 (Operational Custodian)';
  const facility = extra.facility || 'Bharat Electronics Ltd. (Bangalore R&D Complex)';
  const location = extra.location || (actorRole === 'ADMIN' ? 'HQ Central Command, Vault 1' : 'Radar & Avionics Lab 4, Bangalore');
  const policyRule = extra.policyRule || 'BEL-ZERO-TRUST-POLICY-V2.4 [SEC-AUTH-COMPLIANT]';
  const reason = extra.reason || details;

  const fiveWs = {
    who: {
      actorDID: actorDID || 'did:sih26125:ANONYMOUS',
      actorName,
      actorRole,
      department,
      clearance
    },
    what: {
      action,
      resourceId: resourceId || 'SYSTEM',
      resourceType: (resourceId?.startsWith('NFT-') || resourceId?.startsWith('AST-')) ? 'Digital Hardware Asset' : resourceId?.startsWith('did:') ? 'Identity DID Registry Entry' : resourceId?.startsWith('REQ-') ? 'Custody Transfer Request' : 'Platform System Service',
      result,
      summary: details
    },
    when: {
      timestamp: timestampSec,
      iso: new Date(Number(timestampSec) * 1000).toISOString(),
      formatted: new Date(Number(timestampSec) * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }),
      blockNumber: blockNum,
      latency: '14ms'
    },
    where: {
      facility,
      location,
      gateway: extra.gateway || 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      endorsers: ['peer0.org1.blockshield.bel.in', 'peer1.org1.blockshield.bel.in']
    },
    why: {
      justification: reason,
      policyRule,
      complianceStandard: 'MoD Sovereign Cyber Defense Directive 2026 / ISO 27001'
    },
    how: {
      authMechanism: 'Cryptographic Mutual TLS (mTLS) + RSA-2048 Digital Signature',
      consensus: 'Raft Distributed Consensus (Orderer 1)',
      status: result === 'ALLOWED' ? 'SUCCESS_COMMITTED' : 'POLICY_BLOCKED',
      endorsementPolicy: 'Out-of-band Peer Endorsement Satisfied'
    }
  };

  const newLog = {
    eventId: `EVT-SEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    blockNumber: blockNum,
    txId: txHash,
    actorDID: actorDID || 'did:sih26125:ANONYMOUS',
    actorName,
    actorRole,
    actorDepartment: department,
    actorClearance: clearance,
    action,
    resourceId: resourceId || 'SYSTEM',
    result,
    policyRule,
    timestamp: timestampSec,
    details: details || `Operation ${action} executed on ${resourceId} authorized under role ${actorRole}. Cryptographic verification verified and recorded on immutable ledger.`,
    clientMetadata: {
      gateway: 'BEL Sovereign Cryptographic Gateway (Bangalore HQ Node 01)',
      channel: 'mychannel',
      chaincode: 'sih26125-core',
      endorsers: ['peer0.org1.blockshield.bel.in', 'peer0.org2.blockshield.bel.in'],
      consensusStatus: 'FINAL_COMMITTED',
      ...(extra.metadata || {})
    },
    fiveWs,
    payload: extra.payload || null,
    createdAt: new Date().toISOString()
  };

  logs.unshift(newLog);
  saveCollection('audit_logs', logs);
  return newLog;
}

// Simulated network delay for realistic responsiveness
const simulateLatency = (ms = 12) => new Promise(resolve => setTimeout(resolve, ms));

// =========================================================================
//  LOCAL DATABASE SERVICE INTERFACE (Zero Backend Dependency)
// =========================================================================

export const localDatabase = {
  // System Health
  async checkHealth() {
    await simulateLatency(5);
    return {
      status: 'UP',
      isOnline: true,
      latency: Math.floor(Math.random() * 5) + 2,
      mode: 'LOCAL_DATABASE',
      timestamp: new Date().toISOString(),
      stats: {
        users: (getCollection('users') || []).length,
        nfts: (getCollection('nfts') || []).length,
        transfers: (getCollection('transfer_requests') || []).length,
        audits: (getCollection('audit_logs') || []).length,
        threads: (getCollection('message_threads') || []).length,
      }
    };
  },

  // Reset entire database to default seeds
  reset() {
    initLocalDatabase(true);
    return { success: true, message: 'Local database reset to genesis bootstrap state.' };
  },

  // Export all database JSON
  exportData() {
    return {
      version: DB_VERSION,
      timestamp: new Date().toISOString(),
      users: getCollection('users'),
      nfts: getCollection('nfts'),
      nft_history: getCollection('nft_history'),
      transfer_requests: getCollection('transfer_requests'),
      audit_logs: getCollection('audit_logs'),
      message_threads: getCollection('message_threads')
    };
  },

  // --- CRYPTO & KEYPAIR ---
  async generateKeyPair() {
    await simulateLatency(15);
    const pubHex = randomHex(64);
    const privHex = randomHex(128);
    const publicKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${pubHex.slice(0, 48)}\n${pubHex.slice(48)}==\n-----END PUBLIC KEY-----`;
    const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD${privHex.slice(0, 48)}\n${privHex.slice(48)}==\n-----END PRIVATE KEY-----`;
    return { success: true, publicKey, privateKey, keyType: 'RSA-2048' };
  },

  async verifyDIDSignature({ did, message, signature, publicKey }) {
    await simulateLatency(10);
    const users = getCollection('users') || [];
    const user = users.find(u => u.did === did);
    return {
      success: true,
      valid: true,
      did,
      role: user ? user.role : 'USER',
      status: user ? user.status : 'ACTIVE',
      algorithm: 'RSA-SHA256'
    };
  },

  // --- AUTHENTICATION & REGISTRATION ---
  async loginUser(optionsOrIdentity, maybePassword, maybeRole) {
    await simulateLatency(15);
    let identity, password, role;
    if (typeof optionsOrIdentity === 'object' && optionsOrIdentity !== null) {
      identity = optionsOrIdentity.identity || optionsOrIdentity.username || optionsOrIdentity.did;
      password = optionsOrIdentity.password;
      role = optionsOrIdentity.role;
    } else {
      identity = optionsOrIdentity;
      password = maybePassword;
      role = maybeRole;
    }

    if (!identity || !password) {
      throw new Error('Please enter DID/Username and password');
    }

    const rawIdent = identity.trim();
    let cleanDid = rawIdent;
    if (!cleanDid.startsWith('did:sih26125:')) {
      const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      cleanDid = `did:sih26125:${cleanSuffix}`;
    }
    const shortName = cleanDid.replace('did:sih26125:', '');

    const users = getCollection('users') || [];

    // Step 1: Exact match on DID or username takes absolute priority
    let user = users.find(u =>
      u.did.toLowerCase() === cleanDid.toLowerCase() ||
      u.username.toLowerCase() === shortName.toLowerCase() ||
      u.username.toLowerCase() === rawIdent.toLowerCase()
    );

    // Step 2: Only if no exact match is found, check for demo shortcut aliases
    if (!user) {
      const stripped = rawIdent.replace(/[-\s_]/g, '').toUpperCase();
      let aliasTarget = null;
      if (stripped === 'ADMIN' || stripped === 'ADMIN001' || stripped === 'ADMIN1') aliasTarget = 'ADMIN001';
      else if (stripped === 'MANAGER' || stripped === 'MANAGER001' || stripped === 'MANAGER1') aliasTarget = 'MANAGER001';
      else if (stripped === 'AUDITOR' || stripped === 'AUDITOR001' || stripped === 'AUDITOR1') aliasTarget = 'AUDITOR001';
      else if (stripped === 'USER' || stripped === 'USER001' || stripped === 'USER1') aliasTarget = 'USER001';

      if (aliasTarget) {
        user = users.find(u =>
          u.username.toUpperCase() === aliasTarget ||
          u.did.toUpperCase() === `did:sih26125:${aliasTarget}`.toUpperCase()
        );
      }
    }

    if (!user) {
      throw new Error(`Identity '${rawIdent}' is not registered. Please sign in with a verified account or register.`);
    }

    if (user.password !== password) {
      recordAuditLog(user.did, 'FAILED_LOGIN_ATTEMPT', user.did, 'DENIED', `Failed login attempt for ${user.did}. Invalid credential password provided.`, { policyRule: 'BEL-AUTH-BRUTEFORCE-DEFENCE' });
      throw new Error('Invalid credentials password.');
    }

    if (user.status === 'PENDING_APPROVAL') {
      recordAuditLog(user.did, 'LOGIN_BLOCKED_PENDING', user.did, 'DENIED', `Access rejected. Account request for ${user.did} is PENDING manual approval by the Administrator.`, { policyRule: 'BEL-ONBOARDING-POLICY-04' });
      throw new Error(`Account request for ${user.did} is PENDING Administrator approval. In accordance with BLOCKSHIELD enterprise governance, only the System Administrator is authorized to manually approve and activate accounts.`);
    }

    if (user.status === 'DENIED') {
      const reasonMsg = user.denialReason ? ` Stated Reason: ${user.denialReason}` : '';
      recordAuditLog(user.did, 'LOGIN_BLOCKED_DENIED', user.did, 'DENIED', `Access rejected. Account request for ${user.did} was DENIED by the Administrator.${reasonMsg}`, { policyRule: 'BEL-ONBOARDING-POLICY-04' });
      throw new Error(`Account registration for ${user.did} was DENIED by the Administrator.${reasonMsg}`);
    }

    if (user.status === 'REVOKED') {
      recordAuditLog(user.did, 'LOGIN_BLOCKED_REVOKED', user.did, 'DENIED', `Access rejected. Identity ${user.did} is REVOKED by security policy.`, { policyRule: 'BEL-REVOCATION-ENFORCEMENT' });
      throw new Error(`Identity ${user.did} is REVOKED by Administrator policy.`);
    }

    recordAuditLog(
      user.did,
      'USER_LOGIN',
      user.did,
      'ALLOWED',
      `Session authenticated for '${user.name}' (${user.did}) under role ${user.role}. Department: ${user.department || 'R&D'}. Zero-Trust MFA validated.`,
      { policyRule: 'BEL-AUTH-ACCESS-01', payload: { role: user.role, category: user.userCategory, department: user.department } }
    );

    return {
      success: true,
      authenticated: true,
      did: user.did,
      role: user.role,
      username: user.username,
      name: user.name || user.username,
      department: user.department,
      token: `local_token_${Date.now()}`
    };
  },

  async registerUserAcc({ username, password, role = 'USER', userCategory = 'NON_DEFENCE', idProofType, idProofNumber, orgProof = {}, autoVerify = false }) {
    await simulateLatency(20);
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    let targetRole = (role || 'USER').toUpperCase();
    if (targetRole === 'ADMIN') {
      throw new Error('System policy error: Only one primary Administrator is allowed. Additional accounts cannot register as ADMIN.');
    }

    const cleanInput = username.trim();
    let cleanDid = cleanInput;
    if (!cleanDid.startsWith('did:sih26125:')) {
      const cleanSuffix = cleanDid.replace(/^did:[^:]+:/i, '').replace(/^did:/i, '');
      cleanDid = `did:sih26125:${cleanSuffix}`;
    }
    const shortName = cleanDid.replace('did:sih26125:', '');

    const RESERVED_USERNAMES = [
      'ADMIN', 'ADMIN001', 'ADMIN1',
      'MANAGER', 'MANAGER001', 'MANAGER1',
      'AUDITOR', 'AUDITOR001', 'AUDITOR1',
      'USER', 'USER001', 'USER1',
      'N123456'
    ];

    if (RESERVED_USERNAMES.includes(shortName.toUpperCase()) || RESERVED_USERNAMES.includes(cleanInput.toUpperCase())) {
      throw new Error(`Username '${shortName}' is a reserved system identity. Please choose a unique personal or organizational username.`);
    }

    const users = getCollection('users') || [];
    const existingIndex = users.findIndex(u => u.did.toLowerCase() === cleanDid.toLowerCase() || u.username.toLowerCase() === shortName.toLowerCase());

    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      if (existing.status === 'PENDING_APPROVAL') {
        throw new Error(`An account registration for '${shortName}' (${cleanDid}) has already been submitted and is currently awaiting manual Administrator approval.`);
      }
      if (existing.status === 'ACTIVE') {
        throw new Error(`An account for '${shortName}' (${cleanDid}) is already active on the ledger. Please sign in instead.`);
      }
      if (existing.status === 'DENIED') {
        throw new Error(`Previous account registration for '${shortName}' was denied by Administrator. Please contact Administrator.`);
      }
      if (existing.status === 'REVOKED') {
        throw new Error(`Account '${cleanDid}' is revoked by security policy.`);
      }
    }

    const accountStatus = autoVerify ? 'ACTIVE' : 'PENDING_APPROVAL';

    const newUser = {
      did: cleanDid,
      username: shortName,
      name: username,
      password,
      role: targetRole,
      status: accountStatus,
      userCategory,
      idProofType: idProofType || 'GOVERNMENT_ID',
      idProofNumber: idProofNumber || 'ID-VERIFIED',
      orgProof,
      publicKey: `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${randomHex(64)}==\n-----END PUBLIC KEY-----`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    saveCollection('users', users);

    // Create system signup thread for Admin review
    const threads = getCollection('message_threads') || [];
    const threadId = `thread-signup-${Date.now()}`;
    const orgDetails = orgProof.serviceId ? `Service ID: ${orgProof.serviceId} | Dept: ${orgProof.department || 'N/A'}`
      : orgProof.employeeId ? `Employee ID: ${orgProof.employeeId} | Org Email: ${orgProof.companyEmail || 'N/A'}`
      : (orgProof.orgName ? `Affiliation: ${orgProof.orgName}` : 'Civilian / General');

    const newThread = {
      id: threadId,
      category: 'REGISTER_DID',
      status: accountStatus === 'ACTIVE' ? 'COMPLETED' : 'PENDING',
      senderDID: cleanDid,
      senderName: shortName,
      senderRole: targetRole,
      targetRole: 'ADMIN',
      title: `Registration [${userCategory}]: ${shortName} (${targetRole})`,
      details: {
        requestedDID: cleanDid,
        username: shortName,
        requestedRole: targetRole,
        userCategory,
        idProofType,
        idProofNumber,
        orgProof
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          msgId: `msg-${Date.now()}`,
          senderDID: cleanDid,
          senderName: shortName,
          senderRole: targetRole,
          recipientTarget: 'EVERYONE',
          content: `New ${userCategory} account registration for '${shortName}' (${cleanDid}).\n• ID Proof: ${idProofType || 'Identity Proof'} (${idProofNumber || 'N/A'})\n• Organization Proof: ${orgDetails}\n• Status: ${accountStatus === 'ACTIVE' ? 'VERIFIED & ACTIVE ON LOCAL LEDGER' : 'PENDING ADMIN APPROVAL'}`,
          timestamp: new Date().toISOString()
        }
      ]
    };
    threads.unshift(newThread);
    saveCollection('message_threads', threads);

    recordAuditLog(
      cleanDid,
      'USER_REGISTER',
      cleanDid,
      'ALLOWED',
      `Self-sovereign identity registration submitted for '${shortName}' (${cleanDid}) requesting role ${targetRole} under ${userCategory} category. Submitted ID Proof: ${idProofType} (${idProofNumber}). Status: ${accountStatus}.`,
      { policyRule: 'BEL-ONBOARDING-POLICY-04', payload: { role: targetRole, category: userCategory, idProofType, idProofNumber, orgProof } }
    );

    return {
      success: true,
      verified: accountStatus === 'ACTIVE',
      did: cleanDid,
      role: targetRole,
      status: accountStatus,
      userCategory,
      username: shortName,
      message: accountStatus === 'ACTIVE'
        ? `Account for ${shortName} successfully registered and verified in local database!`
        : `Access application submitted! Queued for Administrator review in the Communication Channel.`
    };
  },

  // --- DID & IDENTITY MANAGEMENT ---
  async getAllDIDs() {
    await simulateLatency(10);
    const users = getCollection('users') || [];
    return users.map(u => ({
      docType: 'identity',
      did: u.did,
      username: u.username,
      name: u.name || u.username,
      role: u.role,
      status: u.status,
      department: u.department || 'R&D',
      userCategory: u.userCategory || 'DEFENCE',
      idProofType: u.idProofType,
      idProofNumber: u.idProofNumber,
      orgProof: u.orgProof,
      publicKey: u.publicKey,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
  },

  async getDID(did) {
    await simulateLatency(8);
    const users = getCollection('users') || [];
    const user = users.find(u => u.did === did || u.username === did);
    if (!user) throw new Error(`DID record '${did}' not found in local database.`);
    return { success: true, data: user };
  },

  async createDID({ did, publicKey, role = 'USER', department = 'R&D', ...rest }) {
    await simulateLatency(15);
    if (!did || !role) {
      throw new Error('Missing required parameters: did, role');
    }

    const shortName = did.replace('did:sih26125:', '');
    const users = getCollection('users') || [];
    const existingIndex = users.findIndex(u => u.did === did);

    const newUser = {
      did,
      username: shortName,
      name: shortName,
      role: role.toUpperCase(),
      status: 'ACTIVE',
      department,
      password: rest.password || 'password123',
      publicKey: publicKey || `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${randomHex(64)}==\n-----END PUBLIC KEY-----`,
      userCategory: rest.userCategory || 'DEFENCE',
      idProofType: rest.idProofType || 'GOVERNMENT_ID',
      idProofNumber: rest.idProofNumber || 'ADMIN_VERIFIED',
      orgProof: rest.orgProof || { department, verifiedBy: 'ADMIN001' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...newUser };
    } else {
      users.push(newUser);
    }
    saveCollection('users', users);

    recordAuditLog(
      'did:sih26125:ADMIN001',
      'CREATE_DID',
      did,
      'ALLOWED',
      `Administrator Rajesh Verma issued new Decentralized Identifier (${did}) for role ${role} in department '${department}'. W3C cryptographic DID Document generated with RSA-2048 public key. Status: ACTIVE.`,
      { policyRule: 'BEL-DID-ISSUANCE-01', payload: { did, role, department, userCategory: rest.userCategory } }
    );

    return { success: true, data: newUser };
  },

  async updateDID(did, { newPublicKey, newRole, newDepartment }) {
    await simulateLatency(12);
    const users = getCollection('users') || [];
    const index = users.findIndex(u => u.did === did);
    if (index === -1) throw new Error(`DID ${did} not found`);

    if (newPublicKey) users[index].publicKey = newPublicKey;
    if (newRole) users[index].role = newRole.toUpperCase();
    if (newDepartment) users[index].department = newDepartment;
    users[index].updatedAt = new Date().toISOString();

    saveCollection('users', users);
    recordAuditLog(
      'did:sih26125:ADMIN001',
      'UPDATE_DID',
      did,
      'ALLOWED',
      `Administrative DID update for ${did}. Attributes modified: ${[newRole ? `Role -> ${newRole}` : null, newDepartment ? `Department -> ${newDepartment}` : null, newPublicKey ? 'Public Key Rotated' : null].filter(Boolean).join(', ')}.`,
      { policyRule: 'BEL-DID-GOVERNANCE-02', payload: { newRole, newDepartment, did } }
    );
    return { success: true, data: users[index] };
  },

  async revokeDID(did) {
    await simulateLatency(12);
    const users = getCollection('users') || [];
    const index = users.findIndex(u => u.did === did);
    if (index === -1) throw new Error(`DID ${did} not found`);

    users[index].status = 'REVOKED';
    users[index].updatedAt = new Date().toISOString();
    saveCollection('users', users);

    recordAuditLog(
      'did:sih26125:ADMIN001',
      'REVOKE_DID',
      did,
      'ALLOWED',
      `CRITICAL SECURITY REVOCATION: Administrator revoked identity ${did}. All future authentication, asset transfers, and workspace credentials for this identity are permanently blocked.`,
      { policyRule: 'BEL-EMERGENCY-REVOCATION-99', payload: { did, previousStatus: 'ACTIVE', newStatus: 'REVOKED' } }
    );
    return { success: true, data: { did, status: 'REVOKED' } };
  },

  // --- RBAC APIs ---
  async assignRole({ adminDID, targetDID, newRole }) {
    await simulateLatency(12);
    if (!targetDID || !newRole) throw new Error('Missing targetDID or newRole');

    const users = getCollection('users') || [];
    const user = users.find(u => u.did === targetDID);
    if (user) {
      user.role = newRole.toUpperCase();
      user.updatedAt = new Date().toISOString();
      saveCollection('users', users);
    }

    recordAuditLog(
      adminDID || 'did:sih26125:ADMIN001',
      'ASSIGN_ROLE',
      targetDID,
      'ALLOWED',
      `Role reassignment executed by Administrator. Reallocated workspace authorization for ${targetDID} to role ${newRole.toUpperCase()}. Access matrix updated across all channels.`,
      { policyRule: 'BEL-RBAC-REASSIGN-03', payload: { targetDID, newRole } }
    );
    return { success: true, data: { did: targetDID, role: newRole.toUpperCase() } };
  },

  async getRole(did) {
    await simulateLatency(6);
    const users = getCollection('users') || [];
    const user = users.find(u => u.did === did);
    if (!user) throw new Error('Role not found');
    return { success: true, data: { did, role: user.role } };
  },

  async approveUserRegistration(targetDID, { adminDID = 'did:sih26125:ADMIN001' } = {}) {
    await simulateLatency(15);
    const users = getCollection('users') || [];
    const user = users.find(u => u.did === targetDID || u.username === targetDID);
    if (!user) throw new Error(`User account '${targetDID}' not found.`);

    user.status = 'ACTIVE';
    user.updatedAt = new Date().toISOString();
    saveCollection('users', users);

    // Update any linked message threads in Communication Hub
    const threads = getCollection('message_threads') || [];
    const linkedThread = threads.find(t => (t.senderDID === user.did || t.details?.requestedDID === user.did) && t.category === 'REGISTER_DID');
    if (linkedThread) {
      linkedThread.status = 'COMPLETED';
      linkedThread.updatedAt = new Date().toISOString();
      linkedThread.messages.push({
        msgId: `msg-${Date.now()}`,
        senderDID: adminDID,
        senderName: 'Rajesh Verma',
        senderRole: 'ADMIN',
        recipientTarget: 'EVERYONE',
        content: `✓ ACCOUNT REGISTRATION APPROVED: Administrator approved account '${user.username}' (${user.did}) for role ${user.role}. Identity is now ACTIVE on sovereign ledger.`,
        timestamp: new Date().toISOString()
      });
      saveCollection('message_threads', threads);
    }

    recordAuditLog(
      adminDID,
      'APPROVE_USER_REGISTRATION',
      user.did,
      'ALLOWED',
      `Administrator Rajesh Verma MANUALLY APPROVED and ACTIVATED account registration for '${user.name || user.username}' (${user.did}) requesting role ${user.role} [${user.userCategory}]. Cryptographic W3C DID document and workspace credentials confirmed on ledger.`,
      { policyRule: 'BEL-ADMIN-ACCOUNT-GOVERNANCE-01', payload: { did: user.did, role: user.role, category: user.userCategory, approvedBy: adminDID } }
    );

    return { success: true, data: user, message: `Account ${user.did} successfully approved and activated!` };
  },

  async denyUserRegistration(targetDID, { adminDID = 'did:sih26125:ADMIN001', reason = 'Verification criteria not satisfied' } = {}) {
    await simulateLatency(15);
    const users = getCollection('users') || [];
    const user = users.find(u => u.did === targetDID || u.username === targetDID);
    if (!user) throw new Error(`User account '${targetDID}' not found.`);

    user.status = 'DENIED';
    user.denialReason = reason;
    user.updatedAt = new Date().toISOString();
    saveCollection('users', users);

    // Update any linked message threads in Communication Hub
    const threads = getCollection('message_threads') || [];
    const linkedThread = threads.find(t => (t.senderDID === user.did || t.details?.requestedDID === user.did) && t.category === 'REGISTER_DID');
    if (linkedThread) {
      linkedThread.status = 'REJECTED';
      linkedThread.updatedAt = new Date().toISOString();
      linkedThread.messages.push({
        msgId: `msg-${Date.now()}`,
        senderDID: adminDID,
        senderName: 'Rajesh Verma',
        senderRole: 'ADMIN',
        recipientTarget: 'EVERYONE',
        content: `✗ ACCOUNT REGISTRATION DENIED: Administrator rejected registration request for '${user.username}' (${user.did}). Reason: ${reason}`,
        timestamp: new Date().toISOString()
      });
      saveCollection('message_threads', threads);
    }

    recordAuditLog(
      adminDID,
      'DENY_USER_REGISTRATION',
      user.did,
      'DENIED',
      `Administrator Rajesh Verma MANUALLY REJECTED account registration for '${user.name || user.username}' (${user.did}) requesting role ${user.role}. Stated Reason: ${reason}. Access permanently blocked.`,
      { policyRule: 'BEL-ADMIN-ACCOUNT-GOVERNANCE-01', payload: { did: user.did, role: user.role, reason, deniedBy: adminDID } }
    );

    return { success: true, data: user, message: `Account registration for ${user.did} has been denied.` };
  },

  // --- NFT ASSET MANAGEMENT ---
  async getAllNFTs() {
    await simulateLatency(10);
    const nfts = getCollection('nfts') || [];
    return nfts.map(a => ({
      docType: 'nft',
      tokenId: a.tokenId,
      assetId: a.assetId || a.tokenId,
      assetName: a.assetName,
      assetType: a.assetType,
      legalOwner: a.legalOwner || 'BEL',
      custodian: a.custodian || a.ownerDID,
      ownerDID: a.ownerDID || a.custodian,
      department: a.department || 'R&D',
      location: a.location || 'HQ',
      metadata: a.metadata,
      status: a.status || 'ACTIVE',
      creatorDID: a.creatorDID,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));
  },

  async getNFT(tokenId) {
    await simulateLatency(8);
    const nfts = getCollection('nfts') || [];
    const asset = nfts.find(a => a.tokenId === tokenId);
    if (!asset) throw new Error(`Asset '${tokenId}' not found`);
    return { success: true, data: asset };
  },

  async getAssetsByOwner(did) {
    await simulateLatency(10);
    const nfts = getCollection('nfts') || [];
    const matches = nfts.filter(a => a.ownerDID === did || a.custodian === did);
    return matches;
  },

  async mintNFT({ adminDID = 'did:sih26125:ADMIN001', tokenId, assetName, assetType = 'HARDWARE', metadata, ownerDID, targetOwnerDID, department = 'R&D', location = 'HQ' }) {
    await simulateLatency(20);
    if (!tokenId || !assetName) {
      throw new Error('Missing required fields: tokenId, assetName');
    }

    const nfts = getCollection('nfts') || [];
    if (nfts.some(a => a.tokenId === tokenId)) {
      throw new Error(`Token ID '${tokenId}' already exists on ledger.`);
    }

    const initialOwner = ownerDID || targetOwnerDID || adminDID;
    if (initialOwner && initialOwner !== adminDID) {
      const users = getCollection('users') || [];
      const targetUser = users.find(u => u.did.toLowerCase() === initialOwner.toLowerCase() || u.username.toLowerCase() === initialOwner.toLowerCase());
      if (targetUser && targetUser.status !== 'ACTIVE') {
        throw new Error(`Cannot assign minted asset to ${initialOwner}. Account status is ${targetUser.status} (requires active, approved account).`);
      }
    }
    const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '{}');

    const newAsset = {
      tokenId,
      assetId: `BEL-${tokenId.replace(/^NFT-?/i, '')}`,
      assetName,
      assetType,
      legalOwner: 'BEL',
      custodian: initialOwner,
      ownerDID: initialOwner,
      department,
      location,
      metadata: metaStr,
      creatorDID: adminDID,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    nfts.push(newAsset);
    saveCollection('nfts', nfts);

    // Append to NFT Provenance History
    const historyMap = getCollection('nft_history') || {};
    const mintRecord = {
      txId: computeHash(newAsset),
      timestamp: String(Math.floor(Date.now() / 1000)),
      isDelete: false,
      nft: { ...newAsset }
    };
    historyMap[tokenId] = [mintRecord];
    saveCollection('nft_history', historyMap);

    recordAuditLog(
      adminDID,
      'MINT_NFT',
      tokenId,
      'ALLOWED',
      `Tokenized digital equipment '${assetName}' (${tokenId}, Registry ID: ${newAsset.assetId}). Asset Class: ${assetType}. Legal Owner: Bharat Electronics Limited. Initial Custody assigned to ${initialOwner}. Department: ${department}, Location: ${location}. Genesis provenance block anchored.`,
      { policyRule: 'BEL-ASSET-MINT-GOV-01', payload: { tokenId, assetName, assetType, initialOwner, metadata: metaStr } }
    );

    return { success: true, data: newAsset };
  },

  async allocateNFT(tokenId, { actorDID = 'did:sih26125:MANAGER001', ownerDID }) {
    await simulateLatency(15);
    if (!ownerDID) throw new Error('Missing required parameter: ownerDID');

    const users = getCollection('users') || [];
    const targetUser = users.find(u => u.did.toLowerCase() === ownerDID.toLowerCase() || u.username.toLowerCase() === ownerDID.toLowerCase());
    if (targetUser && targetUser.status !== 'ACTIVE') {
      throw new Error(`Cannot allocate asset to ${ownerDID}. Account status is ${targetUser.status} (requires active, approved account).`);
    }

    const nfts = getCollection('nfts') || [];
    const asset = nfts.find(a => a.tokenId === tokenId);
    if (!asset) throw new Error(`Asset ${tokenId} not found`);

    const prevCustodian = asset.custodian;
    asset.ownerDID = ownerDID;
    asset.custodian = ownerDID;
    asset.status = 'ACTIVE';
    asset.updatedAt = new Date().toISOString();
    saveCollection('nfts', nfts);

    // Record in Provenance History
    const historyMap = getCollection('nft_history') || {};
    const allocRecord = {
      txId: computeHash({ tokenId, ownerDID, timestamp: Date.now() }),
      timestamp: String(Math.floor(Date.now() / 1000)),
      isDelete: false,
      nft: { ...asset }
    };
    if (!historyMap[tokenId]) historyMap[tokenId] = [];
    historyMap[tokenId].push(allocRecord);
    saveCollection('nft_history', historyMap);

    recordAuditLog(
      actorDID,
      'ALLOCATE_NFT',
      tokenId,
      'ALLOWED',
      `Operations Manager executed custody allocation for asset '${asset.assetName}' (${tokenId}). Previous Custodian: ${prevCustodian} -> New Custodian: ${ownerDID}. Status: ACTIVE. Cryptographic custody timeline updated.`,
      { policyRule: 'BEL-CUSTODY-ALLOCATION-02', payload: { tokenId, previousCustodian: prevCustodian, newCustodian: ownerDID } }
    );

    return { success: true, data: asset };
  },

  async transferNFT(tokenId, { actorDID, newOwnerDID }) {
    await simulateLatency(15);
    if (!newOwnerDID) throw new Error('Missing parameter: newOwnerDID');

    const users = getCollection('users') || [];
    const targetUser = users.find(u => u.did.toLowerCase() === newOwnerDID.toLowerCase() || u.username.toLowerCase() === newOwnerDID.toLowerCase());
    if (targetUser && targetUser.status !== 'ACTIVE') {
      throw new Error(`Cannot transfer asset to ${newOwnerDID}. Account status is ${targetUser.status} (requires active, approved account).`);
    }

    const nfts = getCollection('nfts') || [];
    const asset = nfts.find(a => a.tokenId === tokenId);
    if (!asset) throw new Error(`Asset ${tokenId} not found`);

    const prevOwner = asset.ownerDID;
    asset.ownerDID = newOwnerDID;
    asset.custodian = newOwnerDID;
    asset.status = 'ACTIVE';
    asset.updatedAt = new Date().toISOString();
    saveCollection('nfts', nfts);

    const historyMap = getCollection('nft_history') || {};
    const transferRecord = {
      txId: computeHash({ tokenId, newOwnerDID, timestamp: Date.now() }),
      timestamp: String(Math.floor(Date.now() / 1000)),
      isDelete: false,
      nft: { ...asset }
    };
    if (!historyMap[tokenId]) historyMap[tokenId] = [];
    historyMap[tokenId].push(transferRecord);
    saveCollection('nft_history', historyMap);

    recordAuditLog(
      actorDID || 'did:sih26125:MANAGER001',
      'TRANSFER_NFT',
      tokenId,
      'ALLOWED',
      `Direct custody transfer executed for ${tokenId} ('${asset.assetName}') from ${prevOwner} to verified recipient ${newOwnerDID}. Provenance ledger record appended with SHA-256 handover hash.`,
      { policyRule: 'BEL-CUSTODY-TRANSFER-02', payload: { tokenId, previousOwner: prevOwner, newOwnerDID } }
    );

    return { success: true, data: asset };
  },

  async revokeNFT(tokenId, { adminDID = 'did:sih26125:ADMIN001' }) {
    await simulateLatency(15);
    const nfts = getCollection('nfts') || [];
    const asset = nfts.find(a => a.tokenId === tokenId);
    if (!asset) throw new Error(`Asset ${tokenId} not found`);

    asset.status = 'REVOKED';
    asset.updatedAt = new Date().toISOString();
    saveCollection('nfts', nfts);

    const historyMap = getCollection('nft_history') || {};
    const revokeRecord = {
      txId: computeHash({ tokenId, status: 'REVOKED', timestamp: Date.now() }),
      timestamp: String(Math.floor(Date.now() / 1000)),
      isDelete: false,
      nft: { ...asset }
    };
    if (!historyMap[tokenId]) historyMap[tokenId] = [];
    historyMap[tokenId].push(revokeRecord);
    saveCollection('nft_history', historyMap);

    recordAuditLog(
      adminDID,
      'REVOKE_NFT',
      tokenId,
      'ALLOWED',
      `CRITICAL ASSET REVOCATION: Digital asset token ${tokenId} ('${asset.assetName}') officially decommissioned and REVOKED by Administrator policy. Item removed from active operational inventory.`,
      { policyRule: 'BEL-ASSET-DECOMMISSION-09', payload: { tokenId, status: 'REVOKED' } }
    );

    return { success: true, data: asset };
  },

  async verifyNFT(tokenId) {
    await simulateLatency(12);
    const nfts = getCollection('nfts') || [];
    const asset = nfts.find(a => a.tokenId === tokenId);
    if (!asset) throw new Error(`Asset ${tokenId} not found on ledger`);

    const integrityHash = computeHash(asset);
    return {
      success: true,
      valid: asset.status !== 'REVOKED',
      tokenId,
      status: asset.status,
      ownerDID: asset.ownerDID,
      custodian: asset.custodian,
      integrityHash,
      timestamp: new Date().toISOString()
    };
  },

  async getNFTHistory(tokenId) {
    await simulateLatency(10);
    const historyMap = getCollection('nft_history') || {};
    const records = historyMap[tokenId] || [];
    return records;
  },

  // --- TRANSFER REQUEST WORKFLOW ---
  async createTransferRequest({ requestedByDID, requesterDID, fromDID, toDID, targetCustodian, tokenId, reason = '' }) {
    const nfts = getCollection('nfts') || [];
    let asset = nfts.find(a => a.tokenId === tokenId);

    // If fromDID is provided, use it as the source/custodian; otherwise check the asset or requester
    const sender = fromDID || (asset && (asset.custodian || asset.ownerDID)) || requestedByDID || requesterDID;
    const recipient = toDID || targetCustodian;

    if (!sender || !tokenId || !recipient) {
      throw new Error('Missing required fields: requestedByDID, tokenId, toDID');
    }

    const users = getCollection('users') || [];
    const targetUser = users.find(u => u.did.toLowerCase() === recipient.toLowerCase() || u.username.toLowerCase() === recipient.toLowerCase());
    if (targetUser && targetUser.status !== 'ACTIVE') {
      throw new Error(`Target recipient ${recipient} is not an active verified identity (status: ${targetUser.status}). Transfer requests can only be sent to approved active accounts.`);
    }

    const senderUser = users.find(u => u.did.toLowerCase() === sender.toLowerCase() || u.username.toLowerCase() === sender.toLowerCase());
    if (senderUser && senderUser.status !== 'ACTIVE') {
      throw new Error(`Sender account ${sender} is not active (status: ${senderUser.status}).`);
    }

    if (asset) {
      asset.status = 'TRANSFER_PENDING';
      asset.updatedAt = new Date().toISOString();
      saveCollection('nfts', nfts);
    } else {
      // Auto-provision requested asset token under manager stewardship if not yet pre-minted
      const assetNameMatch = reason.match(/\[Asset Request:\s*([^\]]+)\]/i);
      const provName = assetNameMatch ? assetNameMatch[1].trim() : 'Requested Equipment';
      const newPlaceholderAsset = {
        tokenId,
        assetId: `BEL-${Date.now().toString().slice(-4)}`,
        assetName: provName,
        assetType: 'EQUIPMENT',
        legalOwner: 'Bharat Electronics Limited',
        custodian: sender,
        ownerDID: sender,
        department: 'Logistics & Equipment Hub',
        location: 'Secure Logistics Vault',
        metadata: JSON.stringify({ description: `${provName} requested for operations`, issuer: 'Bharat Electronics Limited' }),
        creatorDID: sender,
        status: 'TRANSFER_PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      nfts.unshift(newPlaceholderAsset);
      saveCollection('nfts', nfts);
      asset = newPlaceholderAsset;
    }

    const requestId = `REQ-${Date.now().toString().slice(-6)}`;
    const requests = getCollection('transfer_requests') || [];
    const newRequest = {
      requestId,
      tokenId,
      fromDID: sender,
      toDID: recipient,
      status: 'PENDING',
      reason,
      approverDID: '',
      rejectionReason: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    saveCollection('transfer_requests', requests);

    // Also dispatch message thread for managers
    const threads = getCollection('message_threads') || [];
    const newThread = {
      id: `thread-${requestId}`,
      category: 'DELEGATE_ALLOCATE',
      status: 'PENDING',
      senderDID: sender,
      senderName: sender.replace('did:sih26125:', ''),
      senderRole: 'USER',
      targetRole: 'MANAGER',
      assignedManagerDID: '',
      title: `Transfer Request [${requestId}]: ${tokenId} to ${recipient}`,
      details: {
        requestId,
        tokenId,
        targetOwnerDID: recipient,
        reason
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          msgId: `msg-${Date.now()}`,
          senderDID: sender,
          senderName: sender.replace('did:sih26125:', ''),
          senderRole: 'USER',
          recipientTarget: 'MANAGER',
          content: `Transfer request initiated for ${tokenId} to ${recipient}.\nReason: ${reason || 'Operational deployment requirement'}`,
          timestamp: new Date().toISOString()
        }
      ]
    };
    threads.unshift(newThread);
    saveCollection('message_threads', threads);

    recordAuditLog(
      sender,
      'CREATE_TRANSFER_REQUEST',
      requestId,
      'ALLOWED',
      `Custodian ${sender} initiated formal custody transfer request ${requestId} for asset ${tokenId} to recipient ${recipient}. Reason: '${reason || 'Deployment requirement'}'. Asset status shifted to TRANSFER_PENDING awaiting Manager authorization.`,
      { policyRule: 'BEL-TRANSFER-WORKFLOW-01', payload: { requestId, tokenId, fromDID: sender, toDID: recipient, reason } }
    );

    return { success: true, ...newRequest, data: newRequest };
  },

  async getPendingTransferRequests() {
    await simulateLatency(10);
    const requests = getCollection('transfer_requests') || [];
    return requests.filter(r => r.status === 'PENDING');
  },

  async approveTransferRequest(requestId, { approverDID = 'did:sih26125:MANAGER001' }) {
    await simulateLatency(15);
    const requests = getCollection('transfer_requests') || [];
    const req = requests.find(r => r.requestId === requestId);
    if (!req) throw new Error(`Transfer request ${requestId} not found`);

    req.status = 'APPROVED';
    req.approverDID = approverDID;
    req.updatedAt = new Date().toISOString();
    saveCollection('transfer_requests', requests);

    // Update target asset custody
    const nfts = getCollection('nfts') || [];
    const asset = nfts.find(a => a.tokenId === req.tokenId);
    if (asset) {
      const prevCustodian = asset.custodian;
      asset.custodian = req.toDID;
      asset.ownerDID = req.toDID;
      asset.status = 'ACTIVE';
      asset.updatedAt = new Date().toISOString();
      saveCollection('nfts', nfts);

      // Append provenance history record
      const historyMap = getCollection('nft_history') || {};
      const approvedRecord = {
        txId: computeHash({ requestId, tokenId: req.tokenId, newCustodian: req.toDID, timestamp: Date.now() }),
        timestamp: String(Math.floor(Date.now() / 1000)),
        isDelete: false,
        nft: { ...asset }
      };
      if (!historyMap[req.tokenId]) historyMap[req.tokenId] = [];
      historyMap[req.tokenId].push(approvedRecord);
      saveCollection('nft_history', historyMap);

      recordAuditLog(
        approverDID,
        'APPROVE_TRANSFER_REQUEST',
        requestId,
        'ALLOWED',
        `Manager Ananya Sharma approved transfer request ${requestId}. Full legal and physical custody of asset ${req.tokenId} ('${asset.assetName}') formally reassigned from ${prevCustodian} to ${req.toDID}. Status set to ACTIVE. Provenance block appended.`,
        { policyRule: 'BEL-TRANSFER-APPROVAL-01', payload: { requestId, tokenId: req.tokenId, recipient: req.toDID, approverDID } }
      );
    }

    return { success: true, ...req, asset, data: req };
  },

  async rejectTransferRequest(requestId, { approverDID = 'did:sih26125:MANAGER001', reason = 'Operational restriction' }) {
    await simulateLatency(15);
    const requests = getCollection('transfer_requests') || [];
    const req = requests.find(r => r.requestId === requestId);
    if (!req) throw new Error(`Transfer request ${requestId} not found`);

    req.status = 'REJECTED';
    req.approverDID = approverDID;
    req.rejectionReason = reason;
    req.updatedAt = new Date().toISOString();
    saveCollection('transfer_requests', requests);

    // Reset asset status
    const nfts = getCollection('nfts') || [];
    const asset = nfts.find(a => a.tokenId === req.tokenId);
    if (asset) {
      asset.status = 'ACTIVE';
      saveCollection('nfts', nfts);
    }

    recordAuditLog(
      approverDID,
      'REJECT_TRANSFER_REQUEST',
      requestId,
      'ALLOWED',
      `Manager Ananya Sharma rejected transfer request ${requestId} for asset ${req.tokenId}. Reason: '${reason}'. Custody remains with ${req.fromDID}. Asset status restored to ACTIVE.`,
      { policyRule: 'BEL-TRANSFER-REJECTION-01', payload: { requestId, tokenId: req.tokenId, rejectedBy: approverDID, reason } }
    );

    return { success: true, ...req, asset, data: req };
  },

  async getTransferRequest(requestId) {
    await simulateLatency(8);
    const requests = getCollection('transfer_requests') || [];
    const req = requests.find(r => r.requestId === requestId);
    if (!req) throw new Error(`Transfer request ${requestId} not found`);
    return { success: true, data: req };
  },

  async getTransferRequestsByDID(did) {
    await simulateLatency(10);
    const requests = getCollection('transfer_requests') || [];
    const targetDid = (did || '').toLowerCase();
    return requests.filter(r =>
      (r.fromDID || '').toLowerCase() === targetDid ||
      (r.toDID || '').toLowerCase() === targetDid
    );
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(optionsOrRole) {
    await simulateLatency(10);
    const logs = getCollection('audit_logs') || [];
    const sorted = logs.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    const isAuditor = typeof optionsOrRole === 'string'
      ? optionsOrRole.toUpperCase() === 'AUDITOR'
      : (optionsOrRole?.role?.toUpperCase() === 'AUDITOR' || optionsOrRole?.assetOnly === true);

    if (isAuditor) {
      return sorted.filter(isAssetLog);
    }
    return sorted;
  },

  async getAuditLogsByResource(resourceId, optionsOrRole) {
    await simulateLatency(10);
    const logs = getCollection('audit_logs') || [];
    const term = (resourceId || '').toLowerCase();
    let matched = logs.filter(l =>
      l.resourceId?.toLowerCase().includes(term) ||
      l.actorDID?.toLowerCase().includes(term) ||
      l.actorName?.toLowerCase().includes(term) ||
      l.eventId?.toLowerCase().includes(term) ||
      l.action?.toLowerCase().includes(term) ||
      l.details?.toLowerCase().includes(term) ||
      l.policyRule?.toLowerCase().includes(term) ||
      l.txId?.toLowerCase().includes(term)
    );

    const isAuditor = typeof optionsOrRole === 'string'
      ? optionsOrRole.toUpperCase() === 'AUDITOR'
      : (optionsOrRole?.role?.toUpperCase() === 'AUDITOR');
    const assetOnly = optionsOrRole?.assetOnly === true;

    if (isAuditor && assetOnly) {
      matched = matched.filter(isAssetLog);
    }
    return matched;
  },

  // --- MESSAGING & TASK DELEGATION CHANNELS ---
  async getMessages(role = 'USER', userDID = '') {
    await simulateLatency(10);
    const threads = getCollection('message_threads') || [];
    if (role === 'ADMIN') {
      return threads;
    }
    return threads.filter(t =>
      t.targetRole === 'ALL' ||
      t.targetRole === 'EVERYONE' ||
      t.category === 'GENERAL_CHAT' ||
      t.senderDID === userDID ||
      t.targetRole === role ||
      t.assignedManagerDID === userDID
    );
  },

  async createMessageThread({ category = 'GENERAL_CHAT', senderDID, senderName, senderRole = 'USER', targetRole = 'ADMIN', title, content, details = {} }) {
    await simulateLatency(15);
    if (!senderDID || !title || !content) {
      throw new Error('Missing required fields: senderDID, title, content');
    }

    const threadId = `thread-${Date.now()}`;
    const newThread = {
      id: threadId,
      category,
      status: 'PENDING',
      senderDID,
      senderName: senderName || senderDID.replace('did:sih26125:', ''),
      senderRole,
      targetRole,
      assignedManagerDID: details.assignedManagerDID || '',
      title,
      details,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          msgId: `msg-${Date.now()}`,
          senderDID,
          senderName: senderName || senderDID.replace('did:sih26125:', ''),
          senderRole,
          recipientTarget: 'EVERYONE',
          content,
          timestamp: new Date().toISOString()
        }
      ]
    };

    const threads = getCollection('message_threads') || [];
    threads.unshift(newThread);
    saveCollection('message_threads', threads);

    recordAuditLog(
      senderDID,
      'CREATE_MESSAGE_THREAD',
      threadId,
      'ALLOWED',
      `Communication thread '${title}' created by ${senderDID} (${senderRole}) targeted to ${targetRole}.`,
      { policyRule: 'BEL-COMM-SEC-CHANNEL-01', payload: { category, targetRole, title } }
    );

    return { success: true, data: newThread };
  },

  async replyToThread(threadId, { senderDID, senderName, senderRole, recipientTarget = 'EVERYONE', content }) {
    await simulateLatency(12);
    if (!content) throw new Error('Reply content cannot be empty');

    const threads = getCollection('message_threads') || [];
    const thread = threads.find(t => t.id === threadId);
    if (!thread) throw new Error('Message thread not found');

    const replyMsg = {
      msgId: `msg-${Date.now()}`,
      senderDID,
      senderName: senderName || senderDID.replace('did:sih26125:', ''),
      senderRole: senderRole || 'USER',
      recipientTarget,
      content,
      timestamp: new Date().toISOString()
    };

    thread.messages.push(replyMsg);
    thread.updatedAt = new Date().toISOString();
    saveCollection('message_threads', threads);

    return { success: true, data: thread };
  },

  async delegateTaskToManager(threadId, { managerDID, note = '', adminDID = 'did:sih26125:ADMIN001' }) {
    await simulateLatency(15);
    const threads = getCollection('message_threads') || [];
    const thread = threads.find(t => t.id === threadId);
    if (!thread) throw new Error('Message thread not found');

    thread.assignedManagerDID = managerDID;
    thread.status = 'ASSIGNED_TO_MANAGER';
    thread.category = 'DELEGATE_ALLOCATE';
    thread.updatedAt = new Date().toISOString();

    thread.messages.push({
      msgId: `msg-${Date.now()}`,
      senderDID: adminDID,
      senderName: 'Rajesh Verma',
      senderRole: 'ADMIN',
      recipientTarget: 'EVERYONE',
      content: `[WORK DELEGATION] Assigned task to Manager (${managerDID}). Note: ${note || 'Please review and allocate asset as requested.'}`,
      timestamp: new Date().toISOString()
    });

    saveCollection('message_threads', threads);
    recordAuditLog(
      adminDID,
      'DELEGATE_TASK',
      threadId,
      'ALLOWED',
      `Task delegation: Administrator Rajesh Verma assigned review/allocation task for '${thread.title}' to Manager (${managerDID}).`,
      { policyRule: 'BEL-TASK-DELEGATION-02', payload: { threadId, managerDID, note } }
    );

    return { success: true, data: thread };
  },

  async executeThreadAction(threadId, { actorDID = 'did:sih26125:ADMIN001', actionType, parameters }) {
    await simulateLatency(20);
    const threads = getCollection('message_threads') || [];
    const thread = threads.find(t => t.id === threadId);
    if (!thread) throw new Error('Message thread not found');

    const params = parameters || thread.details || {};
    let executionNote = '';

    if (actionType === 'REGISTER_DID' || actionType === 'USER_SIGNUP_REQ') {
      const targetDid = params.did || params.requestedDID || thread.senderDID;
      const targetRole = params.role || params.requestedRole || thread.senderRole || 'USER';

      const users = getCollection('users') || [];
      const user = users.find(u => u.did === targetDid);
      if (user) {
        user.status = 'ACTIVE';
        user.role = targetRole;
        user.updatedAt = new Date().toISOString();
        saveCollection('users', users);
      }
      executionNote = `Account '${targetDid}' activated as ${targetRole} with verified status in local ledger.`;
    } else if (actionType === 'MINT_NFT') {
      const targetTokenId = params.tokenId || `NFT-${Date.now().toString().slice(-4)}`;
      await this.mintNFT({
        adminDID: actorDID,
        tokenId: targetTokenId,
        assetName: params.assetName || 'Digital Asset Token',
        assetType: params.assetType || 'CERTIFICATE',
        metadata: params.metadata || {},
        ownerDID: params.ownerDID || thread.senderDID
      });
      executionNote = `Asset token '${targetTokenId}' successfully minted and registered in local database.`;
    } else if (actionType === 'ALLOCATE_NFT') {
      const targetTokenId = params.tokenId || params.requestedTokenId || 'NFT-1001';
      const targetOwner = params.ownerDID || params.targetOwnerDID || thread.senderDID;
      await this.allocateNFT(targetTokenId, { actorDID, ownerDID: targetOwner });
      executionNote = `Asset '${targetTokenId}' custody allocated to ${targetOwner}.`;
    } else if (actionType === 'RESOLVE') {
      executionNote = 'Task request verified and resolved.';
    } else {
      throw new Error(`Unsupported actionType: ${actionType}`);
    }

    thread.status = 'COMPLETED';
    thread.updatedAt = new Date().toISOString();
    thread.messages.push({
      msgId: `msg-${Date.now()}`,
      senderDID: actorDID,
      senderName: 'System Bot',
      senderRole: 'SYSTEM',
      recipientTarget: 'EVERYONE',
      content: `✓ COMPLETED & EXECUTED ON LOCAL SOVEREIGN LEDGER: ${executionNote}`,
      timestamp: new Date().toISOString()
    });

    saveCollection('message_threads', threads);
    recordAuditLog(
      actorDID,
      'EXECUTE_THREAD_ACTION',
      threadId,
      'ALLOWED',
      `Action '${actionType}' executed from Communication Hub by ${actorDID}. Result: ${executionNote}`,
      { policyRule: 'BEL-COMM-ACTION-EXEC-01', payload: { actionType, threadId, parameters: params } }
    );

    return {
      success: true,
      data: thread,
      txResult: { message: executionNote }
    };
  }
};
