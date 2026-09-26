"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = void 0;
const mockData_1 = require("../data/mockData");
const budgetEngine_1 = require("../services/budgetEngine");
const behaviourEngine_1 = require("../services/behaviourEngine");
const getAnalytics = (req, res) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = mockData_1.mockTransactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth));
    const totalSpent = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    const monthIncome = mockData_1.mockTransactions
        .filter((tx) => tx.type === 'income' && tx.date.startsWith(currentMonth))
        .reduce((sum, tx) => sum + tx.amount, 0);
    const totalIncome = monthIncome > 0 ? monthIncome : mockData_1.mockUser.monthlyIncome;
    const totalSaved = mockData_1.mockSavingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalBalance = 8500 - totalSpent + (monthIncome > 0 ? monthIncome - 10000 : 0);
    const budgetLeft = Math.max(0, mockData_1.mockBudgetPlan.spendingBudget - totalSpent);
    const categoryStatuses = budgetEngine_1.BudgetEngine.calculateCategoryStatus(mockData_1.mockBudgetPlan.categories, mockData_1.mockTransactions);
    const categoryBreakdown = categoryStatuses.map((cs) => ({
        category: cs.category,
        amount: cs.spent,
        percentage: cs.percentage,
        limit: cs.limit,
    }));
    // Daily trend last 7 days
    const dailySpendingTrend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayAmount = mockData_1.mockTransactions
            .filter((tx) => tx.type === 'expense' && tx.date === dateStr)
            .reduce((sum, tx) => sum + tx.amount, 0);
        dailySpendingTrend.push({ date: dateStr, amount: dayAmount });
    }
    const behaviourAnalysis = behaviourEngine_1.BehaviourEngine.analyzeUserBehaviour(mockData_1.mockBudgetPlan, mockData_1.mockTransactions, totalSaved, mockData_1.mockBudgetPlan.emergencyReserve);
    const analytics = {
        monthlyIncome: totalIncome,
        totalSpent,
        totalSaved,
        totalBalance,
        budgetLeft,
        financialHealthScore: behaviourAnalysis.healthScore,
        healthStatus: behaviourAnalysis.healthStatus,
        categoryBreakdown,
        dailySpendingTrend,
        budgetAdherencePercentage: budgetEngine_1.BudgetEngine.getOverallBudgetAdherence(categoryStatuses),
    };
    res.json({
        success: true,
        analytics,
    });
};
exports.getAnalytics = getAnalytics;
