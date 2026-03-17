const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// Public: Create Order
router.post('/', orderController.createOrder);

// Admin: List and Complete
router.get('/', authMiddleware, orderController.getOrders);
router.post('/:id/complete', authMiddleware, orderController.completeOrder);

module.exports = router;
