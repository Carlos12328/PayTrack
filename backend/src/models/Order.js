const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    client_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    client_phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    client_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Optional linking to existing client
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'CANCELED'),
        defaultValue: 'PENDING',
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Order;
