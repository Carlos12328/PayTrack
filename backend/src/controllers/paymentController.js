const { Payment, Client } = require('../models');
const { Op } = require('sequelize');

exports.createPayment = async (req, res) => {
    try {
        const { payer_name, amount, date, client_id } = req.body;

        let finalClientId = client_id;

        // Automatic Reconciliation Logic
        if (!finalClientId && payer_name) {
            const normalizedPayerName = payer_name.trim().toLowerCase();

            // Simple exact match (case-insensitive)
            const client = await Client.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('name')),
                    normalizedPayerName
                )
            });

            if (client) {
                finalClientId = client.id;
            }
        }

        const payment = await Payment.create({
            payer_name,
            amount,
            date: date || new Date(),
            client_id: finalClientId
        });

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.findAll({ include: Client });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, { include: Client });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePayment = async (req, res) => {
    try {
        const { payer_name, amount, date, client_id } = req.body;
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        payment.payer_name = payer_name || payment.payer_name;
        payment.amount = amount || payment.amount;
        payment.date = date || payment.date;
        if (client_id !== undefined) payment.client_id = client_id;

        await payment.save();

        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        await payment.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePaymentsBatch = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'IDs array is required' });
        }

        await Payment.destroy({
            where: {
                id: ids
            }
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
