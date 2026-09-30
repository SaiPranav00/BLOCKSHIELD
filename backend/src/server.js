const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`SIH 2026 Blockchain Backend REST API running on http://${HOST}:${PORT}`);
    console.log(`Fabric Channel: ${process.env.CHANNEL_NAME || 'mychannel'}`);
    console.log(`Fabric Chaincode: ${process.env.CHAINCODE_NAME || 'sih26125'}`);
    console.log(`=======================================================`);
});
