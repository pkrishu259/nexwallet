"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportTransactionsCsv = exports.getTransactionById = exports.getTransactions = void 0;
const db_1 = require("../services/db");
const getTransactions = async (req, res) => {
    try {
        const { category, type, search, status, limit = '50', offset = '0' } = req.query;
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const accountId = user.accounts[0].id;
        const whereClause = { accountId };
        if (category && category !== 'All') {
            whereClause.category = String(category);
        }
        if (type && type !== 'All') {
            whereClause.type = String(type);
        }
        if (status && status !== 'All') {
            whereClause.status = String(status);
        }
        if (search) {
            whereClause.OR = [
                { merchantName: { contains: String(search) } },
                { description: { contains: String(search) } },
                { upiRef: { contains: String(search) } },
            ];
        }
        const transactions = await db_1.prisma.transaction.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: Number(limit),
            skip: Number(offset),
        });
        const totalCount = await db_1.prisma.transaction.count({ where: whereClause });
        return res.json({
            transactions,
            totalCount,
            limit: Number(limit),
            offset: Number(offset),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getTransactions = getTransactions;
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await db_1.prisma.transaction.findUnique({
            where: { id },
            include: { account: { select: { accountNumber: true, upiId: true } } },
        });
        if (!transaction)
            return res.status(404).json({ error: 'Transaction not found' });
        return res.json(transaction);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getTransactionById = getTransactionById;
const exportTransactionsCsv = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const transactions = await db_1.prisma.transaction.findMany({
            where: { accountId: user.accounts[0].id },
            orderBy: { timestamp: 'desc' },
        });
        let csv = 'ID,Date,Merchant,Category,Type,Amount,Status,UPI Ref\n';
        for (const t of transactions) {
            csv += `"${t.id}","${t.timestamp.toISOString()}","${t.merchantName}","${t.category}","${t.type}",${t.amount},"${t.status}","${t.upiRef}"\n`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="nexwallet-passbook.csv"');
        return res.send(csv);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.exportTransactionsCsv = exportTransactionsCsv;
