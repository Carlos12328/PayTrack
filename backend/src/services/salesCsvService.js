const fs = require('fs');
const csv = require('csv-parser');
const { Client, Sale, Payment, sequelize } = require('../models');

exports.processSalesCsv = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let importedCount = 0;

                try {
                    for (const row of results) {
                        // Normalize all keys in the row to lower case and trim for easier matching
                        const normalizedRow = {};
                        Object.keys(row).forEach(key => {
                            // Remove special chars and extra spaces for key matching
                            const cleanKey = key.toLowerCase().trim();
                            normalizedRow[cleanKey] = row[key];
                        });

                        // Helper to find value by possible keys
                        const getValue = (possibleKeys) => {
                            for (const key of possibleKeys) {
                                // Check exact match on clean key
                                if (normalizedRow[key] !== undefined) return normalizedRow[key];
                                // Check if clean key contains the partial key (e.g. "nome do cliente" contains "nome")
                                const foundKey = Object.keys(normalizedRow).find(k => k.includes(key));
                                if (foundKey) return normalizedRow[foundKey];
                            }
                            return null;
                        };

                        // Map fields using common variations
                        // Suporte ao formato Google Forms:
                        // "Carimbo de data/hora", "nome:", "Quantidade", "Tipo da trufa", "Dinheiro?"
                        const timestamp = getValue(['carimbo de data/hora', 'carimbo', 'timestamp', 'data/hora', 'data']);
                        const clientName = getValue(['nome:', 'nome', 'cliente', 'name']);
                        const quantityStr = getValue(['quantidade', 'qtd', 'quantity']);
                        const type = getValue(['tipo da trufa', 'tipo', 'type', 'trufa']); // "Fit" or "Normal"
                        const isCash = getValue(['dinheiro?', 'dinheiro', 'cash', 'pagamento']); // "Sim" or empty

                        if (!clientName || !quantityStr) {
                            continue; // Skip invalid rows
                        }

                        const quantity = parseInt(quantityStr, 10);
                        if (isNaN(quantity) || quantity <= 0) continue;

                        const productType = type && type.toLowerCase().includes('fit') ? 'Fit' : 'Normal';

                        // Pricing Logic
                        // Normal: leve 5 pague 4 | Fit: 1=R$8 / par=R$15
                        let unitPrice;
                        if (productType === 'Fit') {
                            const pairs = Math.floor(quantity / 2);
                            const singles = quantity % 2;
                            const totalPrice = (pairs * 15.00) + (singles * 8.00);
                            unitPrice = totalPrice / quantity;
                        } else {
                            // Normal: a cada grupo de 5, cobra 4
                            const groups = Math.floor(quantity / 5);
                            const remainder = quantity % 5;
                            const chargedQty = (groups * 4) + remainder;
                            unitPrice = (chargedQty * 5.00) / quantity;
                        }

                        // Find or Create Client
                        const trimmedName = clientName.trim();
                        // Search using ILIKE logic
                        let client = await Client.findOne({
                            where: sequelize.where(
                                sequelize.fn('lower', sequelize.col('name')),
                                sequelize.fn('lower', trimmedName)
                            )
                        });

                        if (!client) {
                            client = await Client.create({ name: trimmedName });
                        }

                        // Parse Date (DD/MM/YYYY HH:MM:SS)
                        // "03/12/2025 07:08:07"
                        let date = new Date();
                        if (timestamp) {
                            const [datePart, timePart] = timestamp.split(' ');
                            if (datePart) {
                                const [day, month, year] = datePart.split('/');
                                if (day && month && year) {
                                    if (timePart) {
                                        const [hour, minute, second] = timePart.split(':');
                                        date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
                                    } else {
                                        date = new Date(year, month - 1, day);
                                    }
                                }
                            }
                        }

                        // Check for duplicates
                        const existingSale = await Sale.findOne({
                            where: {
                                client_id: client.id,
                                quantity: quantity,
                                product_type: productType,
                                date: date
                            }
                        });

                        if (existingSale) {
                            continue; // Skip duplicate
                        }

                        // Create Sale
                        await Sale.create({
                            client_id: client.id,
                            quantity: quantity,
                            unit_price: unitPrice,
                            product_type: productType,
                            date: date
                        });

                        // Handle Cash Payment
                        if (isCash && ['sim', 'yes', 's', 'y'].includes(isCash.trim().toLowerCase())) {
                            const totalAmount = quantity * unitPrice;

                            // Check for existing payment to avoid duplicates
                            const existingPayment = await Payment.findOne({
                                where: {
                                    client_id: client.id,
                                    amount: totalAmount,
                                    date: date,
                                    payer_name: `Dinheiro - ${client.name}`
                                }
                            });

                            if (!existingPayment) {
                                await Payment.create({
                                    client_id: client.id,
                                    amount: totalAmount,
                                    date: date,
                                    payer_name: `Dinheiro - ${client.name}`
                                });
                            }
                        }

                        importedCount++;
                    }

                    // Clean up file
                    fs.unlinkSync(filePath);
                    resolve({ imported: importedCount });

                } catch (error) {
                    reject(error);
                }
            });
    });
};
