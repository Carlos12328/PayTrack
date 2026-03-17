const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'paytrack',
    process.env.DB_USER || 'paytrack',
    process.env.DB_PASSWORD || 'paytrackpassword',
    {
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
    }
);

module.exports = sequelize;
