const express = require('express');
const router = express.Router();
const nftController = require('../controllers/nft.controller');

router.post('/mint', nftController.mintNFT);
router.get('/', nftController.getAllNFTs);
router.get('/owner/:did', nftController.getAssetsByOwnerDID);
router.get('/:tokenId', nftController.getNFT);
router.post('/:tokenId/allocate', nftController.allocateNFT);
router.post('/:tokenId/transfer', nftController.transferNFT);
router.post('/:tokenId/revoke', nftController.revokeNFT);
router.get('/:tokenId/history', nftController.getNFTHistory);
router.post('/:tokenId/verify', nftController.verifyNFT);

module.exports = router;
