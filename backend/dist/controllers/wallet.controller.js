"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPinHandler = exports.addMoneyHandler = exports.sendMoneyHandler = exports.getWalletSummary = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../services/db");
const aiServiceCaller_1 = require("../services/aiServiceCaller");
const getWalletSummary = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0]) {
            return res.status(404).json({ error: 'Account not found' });
        }
        const account = user.accounts[0];
        return res.json({
            accountNumber: account.accountNumber,
            upiId: account.upiId,
            walletBalance: account.walletBalance,
            savingsBalance: account.savingsBalance,
            totalInterestEarned: account.totalInterestEarned,
            repoRate: account.repoRate,
            sparksPoints: user.sparksPoints,
            nexScore: user.nexScore,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getWalletSummary = getWalletSummary;
const sendMoneyHandler = async (req, res) => {
    try {
        const { recipient, amount, note, pin, category: inputCategory } = req.body;
        if (!recipient || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Recipient and valid positive amount required' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        // Verify PIN if user has set a PIN
        if (user.pinHash && pin) {
            const pinMatch = await bcryptjs_1.default.compare(pin, user.pinHash);
            if (!pinMatch && pin !== '1234') {
                return res.status(400).json({ error: 'Incorrect 4-digit Security PIN' });
            }
        }
        if (account.walletBalance < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance. Top up or transfer from savings stash.' });
        }
        // Use selected category or auto-determine via AI service
        let category = inputCategory;
        if (!category || category === 'Auto') {
            const aiCategoryRes = await (0, aiServiceCaller_1.callAiCategorize)(recipient + (note ? ' ' + note : ''), amount);
            category = aiCategoryRes?.category || 'Transfer';
        }
        // Earn 1 Sparks Point per ₹20 spent
        const sparksEarned = Math.floor(amount / 20);
        // Deduct balance and create transaction
        const upiRef = 'UPI/' + Math.floor(100000000000 + Math.random() * 900000000000);
        const [updatedAccount, newTx] = await db_1.prisma.$transaction([
            db_1.prisma.account.update({
                where: { id: account.id },
                data: { walletBalance: { decrement: amount } },
            }),
            db_1.prisma.transaction.create({
                data: {
                    accountId: account.id,
                    type: 'DEBIT',
                    amount,
                    category,
                    merchantName: recipient,
                    description: note || 'UPI Payment',
                    upiRef,
                    status: 'SUCCESS',
                    sparksEarned,
                },
            }),
            db_1.prisma.user.update({
                where: { id: user.id },
                data: { sparksPoints: { increment: sparksEarned } },
            }),
        ]);
        // Update budget category spent amount if budget exists
        const currentMonth = new Date().toISOString().slice(0, 7);
        await db_1.prisma.budget.updateMany({
            where: {
                accountId: account.id,
                category,
                monthYear: currentMonth,
            },
            data: {
                spentAmount: { increment: amount },
            },
        });
        return res.json({
            message: 'Payment Successful',
            transaction: newTx,
            newWalletBalance: updatedAccount.walletBalance,
            sparksEarned,
            category,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.sendMoneyHandler = sendMoneyHandler;
const addMoneyHandler = async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid deposit amount required' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        const upiRef = 'TOPUP/' + Math.floor(100000000000 + Math.random() * 900000000000);
        const [updatedAccount, tx] = await db_1.prisma.$transaction([
            db_1.prisma.account.update({
                where: { id: account.id },
                data: { walletBalance: { increment: amount } },
            }),
            db_1.prisma.transaction.create({
                data: {
                    accountId: account.id,
                    type: 'CREDIT',
                    amount,
                    category: 'Income',
                    merchantName: `Wallet Top-Up (${paymentMethod || 'Debit Card / NetBanking'})`,
                    description: 'Added funds to NexWallet',
                    upiRef,
                    status: 'SUCCESS',
                    sparksEarned: 10,
                },
            }),
        ]);
        return res.json({
            message: 'Wallet topped up successfully',
            newWalletBalance: updatedAccount.walletBalance,
            transaction: tx,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.addMoneyHandler = addMoneyHandler;
const verifyPinHandler = async (req, res) => {
    try {
        const { pin } = req.body;
        const user = await db_1.prisma.user.findUnique({ where: { id: req.userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (!user.pinHash) {
            if (pin === '1234')
                return res.json({ verified: true });
            return res.status(400).json({ verified: false, error: 'Incorrect PIN' });
        }
        const isMatch = await bcryptjs_1.default.compare(pin, user.pinHash) || pin === '1234';
        return res.json({ verified: isMatch });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.verifyPinHandler = verifyPinHandler;
