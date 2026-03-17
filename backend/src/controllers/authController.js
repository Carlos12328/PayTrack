const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET || 'paytrack_secret_key_change_me';

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.setupAdmin = async (req, res) => {
    try {
        const count = await User.count();
        if (count > 0) {
            return res.status(400).json({ error: 'Admin user already exists' });
        }

        const { username, password } = req.body;
        const user = await User.create({ username, password });
        res.status(201).json({ message: 'Admin created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
