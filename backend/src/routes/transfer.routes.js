const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller');

router.post('/request', transferController.createTransferRequest);
router.get('/pending', transferController.getPendingTransferRequests);
router.post('/:requestId/approve', transferController.approveTransferRequest);
router.post('/:requestId/reject', transferController.rejectTransferRequest);
router.get('/:requestId', transferController.getTransferRequest);
router.get('/did/:did', transferController.getTransferRequestsByDID);

module.exports = router;
