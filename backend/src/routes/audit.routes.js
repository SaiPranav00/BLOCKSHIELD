const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');

router.get('/', auditController.getAuditLogs);
router.get('/:resourceId', auditController.getAuditLogsByResource);

module.exports = router;
