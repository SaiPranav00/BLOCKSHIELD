const app = require('./app');
const { connectDB } = require('./db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

connectDB().then(() => {
    app.listen(PORT, HOST, () => {
        console.log(`=======================================================`);
        console.log(`BLOCKSHIELD Backend & MongoDB running on http://${HOST}:${PORT}`);
        console.log(`Fabric Channel: ${process.env.CHANNEL_NAME || 'mychannel'}`);
        console.log(`Fabric Chaincode: ${process.env.CHAINCODE_NAME || 'sih26125'}`);
        console.log(`=======================================================`);
    });
}).catch(err => {
    console.error('Fatal database startup failure:', err);
    process.exit(1);
});
