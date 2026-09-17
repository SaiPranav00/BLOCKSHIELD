const express = require('express');
const cors = require('cors');

const identityRoutes = require('./routes/identity.routes');
const roleRoutes = require('./routes/role.routes');
const nftRoutes = require('./routes/nft.routes');
const auditRoutes = require('./routes/audit.routes');
const accessRoutes = require('./routes/access.routes');
const messagesRoutes = require('./routes/messages.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Request logging without sensitive information
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// API Routes mapping
app.use('/api/dids', identityRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/auth', accessRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/messages', messagesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

module.exports = app;
