const fs = require('fs');
const iconv = require('iconv-lite');
const csv = require('csv-parser');
const { Client, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.processCsv = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(iconv.decodeStream('win1252'))
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let importedCount = 0;

                try {
                    for (const row of results) {
                        // Normalize keys
                        const normalizedRow = {};
                        Object.keys(row).forEach(key => {
                            normalizedRow[key.trim().toLowerCase()] = row[key];
                        });

                        // Columns: "data", "lançamento", "detalhes", "n° documento", "valor", "tipo lançamento"
                        const type = normalizedRow['lançamento']; // e.g., "Pix - Recebido"
                        const details = normalizedRow['detalhes']; // e.g., "03/11 10:46 72040777172 VANIA QUERINO"
                        const valueStr = normalizedRow['valor'];
                        const dateStr = normalizedRow['data'];

                        const entryType = normalizedRow['tipo lançamento']; // e.g., "Entrada"

                        // Filter: Only "Entrada"
                        if (!entryType || !entryType.toLowerCase().includes('entrada')) continue;
                        if (!valueStr || !details) continue;

                        // Parse Value (e.g., "660,00" -> 660.00)
                        let amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
                        if (isNaN(amount) || amount <= 0) continue;

                        // Extract Name from Details
                        // Format: "DD/MM HH:MM ID NAME"
                        // Regex to capture everything after the ID
                        const nameMatch = details.match(/\d{2}\/\d{2}\s+\d{2}:\d{2}\s+\d+\s+(.+)/);
                        let payerName = nameMatch ? nameMatch[1].trim() : details; // Fallback to full details if regex fails

                        // Attempt to match Client
                        const clients = await Client.findAll();
                        let matchedClient = null;

                        for (const client of clients) {
                            const clientName = client.name.toLowerCase();
                            const payerNameLower = payerName.toLowerCase();

                            // Check if payer name contains client name or vice versa
                            if (payerNameLower.includes(clientName) || clientName.includes(payerNameLower)) {
                                matchedClient = client;
                                break;
                            }
                        }

                        // Parse Date (DD/MM/YYYY)
                        const [day, month, year] = dateStr.split('/');
                        let date = new Date(year, month - 1, day);

                        // Try to extract time from details "DD/MM HH:MM ..."
                        const timeMatch = details.match(/\d{2}\/\d{2}\s+(\d{2}:\d{2})/);
                        if (timeMatch) {
                            const [hour, minute] = timeMatch[1].split(':');
                            date.setHours(hour, minute);
                        }

                        // Check for duplicates
                        const existingPayment = await Payment.findOne({
                            where: {
                                payer_name: payerName,
                                amount: amount,
                                date: date
                            }
                        });

                        if (existingPayment) {
                            continue; // Skip duplicate
                        }

                        // Create Payment (Always create, link if found)
                        await Payment.create({
                            payer_name: payerName,
                            amount: amount,
                            date: date,
                            client_id: matchedClient ? matchedClient.id : null
                        });
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
