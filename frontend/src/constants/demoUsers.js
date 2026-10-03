// Centralized Demo User Accounts for BlockShield Presentations & Testing
export const DEMO_USERS = [
  {
    id: 'ADMIN001',
    username: 'ADMIN001',
    displayName: 'Marcus Chen',
    role: 'ADMIN',
    did: 'did:sih26125:ADMIN001',
    password: 'password123',
    department: 'Security & Governance',
    title: 'Platform Administrator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    badge: 'Platform Control',
    accentColor: '#7c3aed',
  },
  {
    id: 'MANAGER001',
    username: 'MANAGER001',
    displayName: 'Elena Vance',
    role: 'MANAGER',
    did: 'did:sih26125:MANAGER001',
    password: 'password123',
    department: 'Operations & Custody',
    title: 'Asset Operations Manager',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces',
    badge: 'Asset Stewardship',
    accentColor: '#059669',
  },
  {
    id: 'AUDITOR001',
    username: 'AUDITOR001',
    displayName: 'Priya Nair',
    role: 'AUDITOR',
    did: 'did:sih26125:AUDITOR001',
    password: 'password123',
    department: 'Compliance & Audit',
    title: 'Evidence Review Auditor',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
    badge: 'Evidence Review',
    accentColor: '#0891b2',
  },
  {
    id: 'USER001',
    username: 'USER001',
    displayName: 'Jordan Lee',
    role: 'USER',
    did: 'did:sih26125:USER001',
    password: 'password123',
    department: 'Engineering',
    title: 'Digital Asset Custodian',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    badge: 'Personal Account',
    accentColor: '#2563eb',
  },
  {
    id: 'N123456',
    username: 'N123456',
    displayName: 'Aarav Patel',
    role: 'USER',
    did: 'did:sih26125:N123456',
    password: 'password123',
    department: 'Software / Technology',
    title: 'Technical Specialist',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    badge: 'Technology Unit',
    accentColor: '#0284c7',
  },
];

export const getDemoUserByRole = (role) => {
  const normRole = (role || 'USER').toUpperCase();
  return DEMO_USERS.find(u => u.role === normRole) || DEMO_USERS[3];
};

export const getDemoUserById = (id) => {
  if (!id) return DEMO_USERS[0];
  const cleanId = id.toUpperCase().replace(/[-\s_]/g, '');
  return DEMO_USERS.find(u => u.id.replace(/[-\s_]/g, '') === cleanId || u.username.replace(/[-\s_]/g, '') === cleanId || u.did.toUpperCase().includes(cleanId)) || DEMO_USERS[0];
};
