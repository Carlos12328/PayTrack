const { Order, OrderItem, Product, Client, Sale, sequelize } = require('../models');

exports.createOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { client_name, client_phone, items } = req.body;
        // items: [{ product_id, quantity }]

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Carrinho vazio' });
        }

        let total = 0;

        // Calculate total and verify stock handles concurrency? For now simple check.
        for (const item of items) {
            const product = await Product.findByPk(item.product_id);
            if (!product) throw new Error(`Produto ${item.product_id} não encontrado`);
            total += parseFloat(product.price) * item.quantity;
        }

        const order = await Order.create({
            client_name,
            client_phone,
            total,
            status: 'PENDING'
        }, { transaction: t });

        for (const item of items) {
            const product = await Product.findByPk(item.product_id);
            await OrderItem.create({
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: product.price
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json(order);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { status: 'PENDING' },
            include: [
                { model: OrderItem, include: [Product] }
            ],
            order: [['date', 'DESC']]
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.completeOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [{ model: OrderItem, include: [Product] }]
        });

        if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
        if (order.status !== 'PENDING') return res.status(400).json({ error: 'Pedido já finalizado' });

        // Decrease stock and Create Sales
        // Also find/create client?

        // 1. Find/Create Client
        let client = await Client.findOne({ where: { name: order.client_name } });
        if (!client) {
            client = await Client.create({ name: order.client_name, phone: order.client_phone }, { transaction: t });
        }

        for (const item of order.OrderItems) {
            // Deduct Stock
            if (item.Product.stock < item.quantity) {
                // Optional: Allow negative stock or throw error. Let's allow for now but warn? 
                // For strict inventory: throw new Error(`Estoque insuficiente de ${item.Product.name}`);
            }
            await item.Product.decrement('stock', { by: item.quantity, transaction: t });

            // Create Sale record
            await Sale.create({
                client_id: client.id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                product_type: item.Product.type,
                date: new Date() // Now
            }, { transaction: t });
        }

        // Update Order Status
        await order.update({ status: 'COMPLETED', client_id: client.id }, { transaction: t });

        await t.commit();
        res.json({ message: 'Pedido entregue e estoque atualizado' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};
