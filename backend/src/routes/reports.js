const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/balances', reportController.getBalances);

module.exports = router;
