const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages.controller');

router.get('/', messagesController.getMessages);
router.post('/', messagesController.createMessageThread);
router.post('/:threadId/reply', messagesController.replyToThread);
router.put('/:threadId/delegate', messagesController.delegateTaskToManager);
router.post('/:threadId/action', messagesController.executeThreadAction);

module.exports = router;
