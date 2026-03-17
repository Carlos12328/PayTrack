require('dotenv').config();
const { sequelize, User } = require('./src/models');

async function createAdmin() {
    try {
        await sequelize.authenticate();
        await sequelize.sync(); // Ensure tables exist

        const existing = await User.findOne({ where: { username: 'admin' } });
        if (existing) {
            console.log('Admin already exists.');
            process.exit(0);
        }

        await User.create({
            username: 'admin',
            password: 'password123'
        });
        console.log('Admin created: admin / password123');
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

createAdmin();
