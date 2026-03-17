const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/', saleController.createSale);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);
router.put('/:id', saleController.updateSale);
router.delete('/:id', saleController.deleteSale);
router.post('/batch-delete', saleController.deleteSalesBatch);
router.post('/import', upload.single('file'), saleController.importSales);

module.exports = router;
