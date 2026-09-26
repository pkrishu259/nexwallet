"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBudgetLimitHandler = exports.getBudgetSummary = void 0;
const db_1 = require("../services/db");
const aiServiceCaller_1 = require("../services/aiServiceCaller");
const getBudgetSummary = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: { include: { budgets: true } } },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        const currentMonth = new Date().toISOString().slice(0, 7);
        // Fetch transactions for current month to compute live category spend
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const transactions = await db_1.prisma.transaction.findMany({
            where: {
                accountId: account.id,
                type: 'DEBIT',
                timestamp: { gte: startOfMonth },
            },
        });
        const categorySpendMap = {};
        let totalSpentSoFar = 0;
        for (const t of transactions) {
            categorySpendMap[t.category] = (categorySpendMap[t.category] || 0) + t.amount;
            totalSpentSoFar += t.amount;
        }
        const budgets = account.budgets.map((b) => ({
            ...b,
            spentAmount: categorySpendMap[b.category] || b.spentAmount,
        }));
        const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.monthlyLimit, 0);
        // Call AI Spending Prediction Service
        const now = new Date();
        const currentDay = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const aiPrediction = await (0, aiServiceCaller_1.callAiSpendingPrediction)({
            current_day: currentDay,
            days_in_month: daysInMonth,
            spent_so_far: totalSpentSoFar,
            monthly_budget: totalBudgetLimit || 12000,
        });
        return res.json({
            monthYear: currentMonth,
            totalBudgetLimit,
            totalSpentSoFar,
            budgets,
            aiPrediction,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getBudgetSummary = getBudgetSummary;
const updateBudgetLimitHandler = async (req, res) => {
    try {
        const { category, monthlyLimit } = req.body;
        if (!category || !monthlyLimit || monthlyLimit <= 0) {
            return res.status(400).json({ error: 'Category name and positive budget limit required' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const accountId = user.accounts[0].id;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const updatedBudget = await db_1.prisma.budget.upsert({
            where: {
                accountId_category_monthYear: {
                    accountId,
                    category,
                    monthYear: currentMonth,
                },
            },
            update: { monthlyLimit: Number(monthlyLimit) },
            create: {
                accountId,
                category,
                monthlyLimit: Number(monthlyLimit),
                spentAmount: 0.0,
                monthYear: currentMonth,
            },
        });
        return res.json(updatedBudget);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.updateBudgetLimitHandler = updateBudgetLimitHandler;
