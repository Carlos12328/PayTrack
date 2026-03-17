const { Client, Sale, Payment, sequelize } = require('../models');

exports.getBalances = async (req, res) => {
    try {
        const clients = await Client.findAll({
            include: [
                { model: Sale },
                { model: Payment }
            ]
        });

        const report = clients.map(client => {
            const totalConsumed = client.Sales.reduce((sum, sale) => {
                return sum + (sale.quantity * parseFloat(sale.unit_price));
            }, 0);

            const totalPaid = client.Payments.reduce((sum, payment) => {
                return sum + parseFloat(payment.amount);
            }, 0);

            const balance = totalConsumed - totalPaid;

            // Sort sales by date descending
            const salesDetails = client.Sales.map(s => ({
                quantity: s.quantity,
                type: s.product_type,
                date: s.date,
                total: (s.quantity * parseFloat(s.unit_price)).toFixed(2)
            })).sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                id: client.id,
                name: client.name,
                phone: client.phone,
                total_consumed: totalConsumed.toFixed(2),
                total_paid: totalPaid.toFixed(2),
                balance: balance.toFixed(2),
                sales: salesDetails
            };
        });

        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
