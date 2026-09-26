"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviourEngine = void 0;
const budgetEngine_1 = require("./budgetEngine");
class BehaviourEngine {
    static analyzeUserBehaviour(budgetPlan, transactions, currentSavings, emergencyReserve) {
        const categoryStatuses = budgetEngine_1.BudgetEngine.calculateCategoryStatus(budgetPlan.categories, transactions);
        const budgetAdherence = budgetEngine_1.BudgetEngine.getOverallBudgetAdherence(categoryStatuses);
        // Savings rate score
        const targetSavingsRate = 0.20; // 20%
        const actualSavingsRate = budgetPlan.monthlyIncome > 0
            ? budgetPlan.savings / budgetPlan.monthlyIncome
            : 0;
        const savingsScore = Math.min(100, Math.round((actualSavingsRate / targetSavingsRate) * 100));
        // Emergency reserve score
        const emergencyTarget = budgetPlan.emergencyReserve;
        const emergencyScore = emergencyTarget > 0
            ? Math.min(100, Math.round((emergencyReserve / emergencyTarget) * 100))
            : 100;
        // Daily spending average (last 30 days)
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthExpenses = transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth));
        const totalSpentThisMonth = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
        const now = new Date();
        const currentDayOfMonth = Math.max(1, now.getDate());
        const dailyAverageSpending = Math.round(totalSpentThisMonth / currentDayOfMonth);
        const dailySpendingLimit = Math.round(budgetPlan.spendingBudget / 30);
        // Overspending penalty
        const overspendingDetected = dailyAverageSpending > dailySpendingLimit ||
            categoryStatuses.some((c) => c.status === 'EXCEEDED');
        // Unusual transactions check (> 2.5x category average)
        const categoryAverages = {};
        const categoryCounts = {};
        transactions.forEach((tx) => {
            if (tx.type === 'expense') {
                categoryAverages[tx.category] = (categoryAverages[tx.category] || 0) + tx.amount;
                categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1;
            }
        });
        Object.keys(categoryAverages).forEach((cat) => {
            categoryAverages[cat] = categoryAverages[cat] / categoryCounts[cat];
        });
        const unusualTransactions = transactions.filter((tx) => {
            if (tx.type !== 'expense')
                return false;
            const avg = categoryAverages[tx.category] || 0;
            return tx.amount > 2.5 * avg && tx.amount > 300;
        });
        // Calculate composite Financial Health Score (0-100)
        let healthScore = Math.round(budgetAdherence * 0.35 +
            savingsScore * 0.25 +
            emergencyScore * 0.25 +
            (overspendingDetected ? 0 : 15));
        healthScore = Math.max(0, Math.min(100, healthScore));
        let healthStatus = 'Healthy';
        if (healthScore >= 90)
            healthStatus = 'Excellent';
        else if (healthScore >= 75)
            healthStatus = 'Healthy';
        else if (healthScore >= 50)
            healthStatus = 'Needs Attention';
        else
            healthStatus = 'Needs Improvement';
        const warnings = [];
        if (overspendingDetected) {
            warnings.push(`Your daily average spending (₹${dailyAverageSpending}) exceeds your daily target limit (₹${dailySpendingLimit}).`);
        }
        if (emergencyReserve < emergencyTarget) {
            warnings.push(`Emergency fund (₹${emergencyReserve}) is below target reserve (₹${emergencyTarget}).`);
        }
        if (unusualTransactions.length > 0) {
            warnings.push(`Unusual high transaction detected in recent expenses.`);
        }
        return {
            healthScore,
            healthStatus,
            unusualTransactions,
            overspendingDetected,
            dailyAverageSpending,
            dailySpendingLimit,
            warnings,
        };
    }
}
exports.BehaviourEngine = BehaviourEngine;
