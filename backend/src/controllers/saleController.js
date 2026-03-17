const { Sale, Client, sequelize } = require('../models');

// Regra de preço centralizada
// Normal: leve 5 pague 4 (a cada 5 trufas, 1 é brinde)
// Fit: 1 = R$8,00 | par (2) = R$15,00
function calcUnitPrice(type, quantity) {
    if (type === 'Fit') {
        const pairs = Math.floor(quantity / 2);
        const singles = quantity % 2;
        const total = (pairs * 15.00) + (singles * 8.00);
        return total / quantity;
    } else {
        // Normal: a cada grupo de 5, cobra 4
        const groups = Math.floor(quantity / 5);
        const remainder = quantity % 5;
        const chargedQty = (groups * 4) + remainder;
        return (chargedQty * 5.00) / quantity;
    }
}

exports.createSale = async (req, res) => {
    try {
        const { client_id, client_name, quantity, unit_price, date, product_type } = req.body;

        let finalClientId = client_id;

        // If client_name is provided, find or create the client
        if (client_name) {
            const trimmedName = client_name.trim();
            // Case-insensitive search
            let client = await Client.findOne({
                where: sequelize.where(
                    sequelize.fn('lower', sequelize.col('name')),
                    sequelize.fn('lower', trimmedName)
                )
            });

            if (!client) {
                client = await Client.create({ name: trimmedName, phone: null });
            }
            finalClientId = client.id;
        }

        if (!finalClientId) {
            return res.status(400).json({ error: 'Client name or ID is required' });
        }

        // Calculate Price if not provided
        let finalUnitPrice = unit_price;
        const type = product_type || 'Normal';

        if (!finalUnitPrice) {
            finalUnitPrice = calcUnitPrice(type, quantity);
        }

        const sale = await Sale.create({
            client_id: finalClientId,
            quantity,
            unit_price: finalUnitPrice,
            product_type: type,
            date: date || new Date()
        });

        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSales = async (req, res) => {
    try {
        const sales = await Sale.findAll({ include: Client });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id, { include: Client });
        if (!sale) return res.status(404).json({ error: 'Sale not found' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSale = async (req, res) => {
    try {
        const { quantity, unit_price, date, product_type } = req.body;
        const sale = await Sale.findByPk(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        sale.quantity = quantity || sale.quantity;
        sale.product_type = product_type || sale.product_type; // Update type if provided
        sale.date = date || sale.date;

        // Recalculate price if unit_price is NOT provided
        if (unit_price) {
            sale.unit_price = unit_price;
        } else {
            sale.unit_price = calcUnitPrice(sale.product_type, sale.quantity);
        }

        await sale.save();

        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSale = async (req, res) => {
    try {
        const sale = await Sale.findByPk(req.params.id);
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        await sale.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSalesBatch = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'IDs array is required' });
        }

        await Sale.destroy({
            where: {
                id: ids
            }
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.importSales = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const salesCsvService = require('../services/salesCsvService');
        const result = await salesCsvService.processSalesCsv(req.file.path);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
