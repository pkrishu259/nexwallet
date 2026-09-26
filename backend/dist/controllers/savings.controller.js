"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawFromSavingsHandler = exports.depositToSavingsHandler = exports.claimInterestHandler = exports.getSavingsSummary = void 0;
const db_1 = require("../services/db");
const interestCalculator_1 = require("../services/interestCalculator");
const getSavingsSummary = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: { include: { autoSaveRules: true } } },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        const interestMetrics = (0, interestCalculator_1.calculateDailyInterest)(account.savingsBalance, account.repoRate);
        // Fetch interest transaction logs
        const interestLogs = await db_1.prisma.transaction.findMany({
            where: {
                accountId: account.id,
                category: 'Interest',
            },
            orderBy: { timestamp: 'desc' },
            take: 10,
        });
        return res.json({
            savingsBalance: account.savingsBalance,
            totalInterestEarned: account.totalInterestEarned,
            repoRate: account.repoRate,
            interestMetrics,
            autoSaveRules: account.autoSaveRules,
            interestLogs,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getSavingsSummary = getSavingsSummary;
const claimInterestHandler = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const result = await (0, interestCalculator_1.claimDailyInterestReward)(user.accounts[0].id);
        return res.json({
            message: `🎉 Successfully credited ₹${result.credited} interest @ 6.5% RBI Repo Rate!`,
            ...result,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.claimInterestHandler = claimInterestHandler;
const depositToSavingsHandler = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Valid positive amount required' });
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        if (account.walletBalance < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }
        const [updatedAccount, tx] = await db_1.prisma.$transaction([
            db_1.prisma.account.update({
                where: { id: account.id },
                data: {
                    walletBalance: { decrement: amount },
                    savingsBalance: { increment: amount },
                },
            }),
            db_1.prisma.transaction.create({
                data: {
                    accountId: account.id,
                    type: 'DEBIT',
                    amount,
                    category: 'Transfer',
                    merchantName: 'Deposit to High-Yield Savings Stash',
                    description: 'Moved from Wallet to Savings @ 6.5% p.a.',
                    upiRef: 'STASH/' + Math.floor(100000000000 + Math.random() * 900000000000),
                    status: 'SUCCESS',
                    sparksEarned: 5,
                },
            }),
        ]);
        return res.json({
            message: 'Funds transferred to Savings Stash successfully!',
            walletBalance: updatedAccount.walletBalance,
            savingsBalance: updatedAccount.savingsBalance,
            transaction: tx,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.depositToSavingsHandler = depositToSavingsHandler;
const withdrawFromSavingsHandler = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Valid positive amount required' });
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        if (account.savingsBalance < amount) {
            return res.status(400).json({ error: 'Insufficient savings stash balance' });
        }
        const [updatedAccount, tx] = await db_1.prisma.$transaction([
            db_1.prisma.account.update({
                where: { id: account.id },
                data: {
                    savingsBalance: { decrement: amount },
                    walletBalance: { increment: amount },
                },
            }),
            db_1.prisma.transaction.create({
                data: {
                    accountId: account.id,
                    type: 'CREDIT',
                    amount,
                    category: 'Transfer',
                    merchantName: 'Withdrawal from Savings Stash',
                    description: 'Moved from Savings to Wallet',
                    upiRef: 'UNSTASH/' + Math.floor(100000000000 + Math.random() * 900000000000),
                    status: 'SUCCESS',
                    sparksEarned: 0,
                },
            }),
        ]);
        return res.json({
            message: 'Funds withdrawn to Wallet successfully!',
            walletBalance: updatedAccount.walletBalance,
            savingsBalance: updatedAccount.savingsBalance,
            transaction: tx,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.withdrawFromSavingsHandler = withdrawFromSavingsHandler;
