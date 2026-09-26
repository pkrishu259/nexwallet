"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGoalHandler = exports.withdrawFromGoalHandler = exports.depositToGoalHandler = exports.createGoalHandler = exports.getGoalsHandler = void 0;
const db_1 = require("../services/db");
const getGoalsHandler = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const goals = await db_1.prisma.savingsGoal.findMany({
            where: { accountId: user.accounts[0].id },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(goals);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getGoalsHandler = getGoalsHandler;
const createGoalHandler = async (req, res) => {
    try {
        const { title, category, icon, targetAmount, deadline, autoSaveAmount } = req.body;
        if (!title || !targetAmount || targetAmount <= 0) {
            return res.status(400).json({ error: 'Goal title and positive target amount required' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const newGoal = await db_1.prisma.savingsGoal.create({
            data: {
                accountId: user.accounts[0].id,
                title,
                category: category || 'General',
                icon: icon || 'target',
                targetAmount: Number(targetAmount),
                currentAmount: 0.0,
                deadline: deadline ? new Date(deadline) : null,
                autoSaveAmount: autoSaveAmount ? Number(autoSaveAmount) : 0.0,
            },
        });
        return res.json(newGoal);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createGoalHandler = createGoalHandler;
const depositToGoalHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Valid positive deposit amount required' });
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
        const goal = await db_1.prisma.savingsGoal.findUnique({ where: { id } });
        if (!goal)
            return res.status(404).json({ error: 'Savings goal not found' });
        const newCurrent = goal.currentAmount + amount;
        const isCompleted = newCurrent >= goal.targetAmount;
        const [updatedGoal, updatedAccount] = await db_1.prisma.$transaction([
            db_1.prisma.savingsGoal.update({
                where: { id },
                data: {
                    currentAmount: newCurrent,
                    status: isCompleted ? 'COMPLETED' : 'ACTIVE',
                },
            }),
            db_1.prisma.account.update({
                where: { id: account.id },
                data: { walletBalance: { decrement: amount } },
            }),
        ]);
        if (isCompleted) {
            // Reward bonus sparks points for achieving savings goal!
            await db_1.prisma.user.update({
                where: { id: req.userId },
                data: { sparksPoints: { increment: 100 } },
            });
        }
        return res.json({
            message: isCompleted ? '🎉 Goal Completed! 100 bonus Sparks points awarded!' : 'Added funds to goal',
            goal: updatedGoal,
            newWalletBalance: updatedAccount.walletBalance,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.depositToGoalHandler = depositToGoalHandler;
const withdrawFromGoalHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Valid positive amount required' });
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const goal = await db_1.prisma.savingsGoal.findUnique({ where: { id } });
        if (!goal)
            return res.status(404).json({ error: 'Goal not found' });
        if (goal.currentAmount < amount) {
            return res.status(400).json({ error: 'Cannot withdraw more than current goal balance' });
        }
        const [updatedGoal, updatedAccount] = await db_1.prisma.$transaction([
            db_1.prisma.savingsGoal.update({
                where: { id },
                data: { currentAmount: { decrement: amount } },
            }),
            db_1.prisma.account.update({
                where: { id: user.accounts[0].id },
                data: { walletBalance: { increment: amount } },
            }),
        ]);
        return res.json({
            message: 'Withdrawn funds from goal to wallet',
            goal: updatedGoal,
            newWalletBalance: updatedAccount.walletBalance,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.withdrawFromGoalHandler = withdrawFromGoalHandler;
const deleteGoalHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const goal = await db_1.prisma.savingsGoal.findUnique({ where: { id } });
        if (!goal)
            return res.status(404).json({ error: 'Goal not found' });
        // Refund existing balance to wallet
        if (goal.currentAmount > 0) {
            await db_1.prisma.account.update({
                where: { id: goal.accountId },
                data: { walletBalance: { increment: goal.currentAmount } },
            });
        }
        await db_1.prisma.savingsGoal.delete({ where: { id } });
        return res.json({ message: 'Goal deleted and funds refunded to wallet' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.deleteGoalHandler = deleteGoalHandler;
