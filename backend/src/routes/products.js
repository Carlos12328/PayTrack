const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

// Public route to view products? Usually yes for store, but maybe seperate public endpoint
// For now, let's keep all management under auth. Storefront might use a public variant or same GET.
// Let's protect creates/updates/deletes.

router.get('/', productController.getAllProducts); // Allow public read for now or create specific public route
router.get('/:id', productController.getProductById);
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
