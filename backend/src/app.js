require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('./models');
const clientRoutes = require('./routes/clients');
const saleRoutes = require('./routes/sales');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Determine frontend path (Local vs Docker)
const localFrontend = path.join(__dirname, '../../frontend');
const dockerFrontend = path.join(__dirname, '../frontend');
const frontendPath = fs.existsSync(localFrontend) ? localFrontend : dockerFrontend;

app.use(express.static(frontendPath));

// Routes
app.use('/api/clients', clientRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Database sync and server start
sequelize.sync({ force: false }).then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((err) => {
    console.error('Unable to connect to the database:', err);
});
