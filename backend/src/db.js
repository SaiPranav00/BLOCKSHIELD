const mongoose = require('mongoose');
const User = require('./models/User');
const Asset = require('./models/Asset');
const AuditLog = require('./models/AuditLog');
const MessageThread = require('./models/MessageThread');
const TransferRequest = require('./models/TransferRequest');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blockshield';

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 100, // Handle up to 100 concurrent function executions
            minPoolSize: 10,  // Keep 10 warm connections ready
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            family: 4,        // Use IPv4 to eliminate DNS lookups
            autoIndex: true   // Ensure all compound indexes are built
        });
        console.log(`[MongoDB] Connected successfully to ${MONGODB_URI} (Pool Size: 10-100)`);
        await seedInitialData();
    } catch (err) {
        console.error(`[MongoDB] Connection error:`, err.message);
    }
}

async function seedInitialData() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log('[MongoDB] Seeding initial verified accounts...');
            const seedUsers = [
                {
                    did: 'did:sih26125:ADMIN001',
                    username: 'ADMIN001',
                    name: 'Marcus Chen',
                    role: 'ADMIN',
                    password: 'password123',
                    status: 'ACTIVE',
                    department: 'Executive Governance',
                    userCategory: 'DEFENCE',
                    idProofType: 'GOVERNMENT_ID',
                    idProofNumber: 'GOV-IND-0001',
                    orgProof: { serviceId: 'BEL-EXEC-001', department: 'Executive Governance' }
                },
                {
                    did: 'did:sih26125:MANAGER001',
                    username: 'MANAGER001',
                    name: 'Elena Vance',
                    role: 'MANAGER',
                    password: 'password123',
                    status: 'ACTIVE',
                    department: 'R&D',
                    userCategory: 'DEFENCE',
                    idProofType: 'GOVERNMENT_ID',
                    idProofNumber: 'GOV-IND-4421',
                    orgProof: { serviceId: 'BEL-MGR-001', department: 'R&D Operations' }
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
                    orgProof: { employeeId: 'TECH-AUD-001', companyEmail: 'auditor@blockshield.bel.in' }
                },
                {
                    did: 'did:sih26125:USER001',
                    username: 'USER001',
                    name: 'Jordan Lee',
                    role: 'USER',
                    password: 'password123',
                    status: 'ACTIVE',
                    department: 'R&D',
                    userCategory: 'DEFENCE',
                    idProofType: 'GOVERNMENT_ID',
                    idProofNumber: 'GOV-IND-7782',
                    orgProof: { serviceId: 'BEL-ENG-014', department: 'R&D' }
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
                    orgProof: { serviceId: 'BEL-SRV-9912', department: 'Radar Systems' }
                }
            ];
            await User.insertMany(seedUsers);
            console.log(`[MongoDB] Seeded ${seedUsers.length} foundational accounts.`);
        }

        const assetCount = await Asset.countDocuments();
        if (assetCount === 0) {
            console.log('[MongoDB] Seeding initial digital assets...');
            const seedAssets = [
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
                    metadata: JSON.stringify({ frequencyRange: '9kHz - 6GHz', calibrationDue: '2027-01' }),
                    creatorDID: 'did:sih26125:ADMIN001',
                    status: 'ACTIVE'
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
                    metadata: JSON.stringify({ ram: '128GB', gpu: 'RTX A6000' }),
                    creatorDID: 'did:sih26125:ADMIN001',
                    status: 'ACTIVE'
                }
            ];
            await Asset.insertMany(seedAssets);
            console.log(`[MongoDB] Seeded ${seedAssets.length} initial digital assets.`);
        }

        const threadCount = await MessageThread.countDocuments();
        if (threadCount === 0) {
            console.log('[MongoDB] Seeding initial message threads...');
            const seedThreads = [
                {
                    id: 'thread-general',
                    category: 'GENERAL_CHAT',
                    status: 'ACTIVE',
                    senderDID: 'did:sih26125:ADMIN001',
                    senderName: 'System Admin',
                    senderRole: 'ADMIN',
                    targetRole: 'ALL',
                    title: 'Public Channel (General)',
                    details: {},
                    messages: [
                        {
                            msgId: `msg-${Date.now()}`,
                            senderDID: 'did:sih26125:ADMIN001',
                            senderName: 'System Admin',
                            senderRole: 'ADMIN',
                            recipientTarget: 'EVERYONE',
                            content: 'Welcome to the Fabric Network Group Channel. All members can broadcast and collaborate here.',
                            timestamp: new Date().toISOString()
                        }
                    ]
                }
            ];
            await MessageThread.insertMany(seedThreads);
            console.log(`[MongoDB] Seeded initial message threads.`);
        }
    } catch (e) {
        console.error('[MongoDB] Seeding error:', e.message);
    }
}

module.exports = { connectDB };
