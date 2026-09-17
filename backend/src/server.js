const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`SIH 2026 Blockchain Backend REST API running on port ${PORT}`);
    console.log(`Fabric Channel: ${process.env.CHANNEL_NAME || 'mychannel'}`);
    console.log(`Fabric Chaincode: ${process.env.CHAINCODE_NAME || 'sih26125'}`);
    console.log(`=======================================================`);
});
