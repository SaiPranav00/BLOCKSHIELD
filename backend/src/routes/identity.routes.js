const express = require('express');
const router = express.Router();
const identityController = require('../controllers/identity.controller');

router.post('/generate-keypair', identityController.generateKeyPair);
router.post('/', identityController.createDID);
router.get('/', identityController.getAllDIDs);
router.get('/:did', identityController.getDID);
router.put('/:did', identityController.updateDID);
router.post('/:did/revoke', identityController.revokeDID);
router.post('/verify', identityController.verifyDID);

module.exports = router;
