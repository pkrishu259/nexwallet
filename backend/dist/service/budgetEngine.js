"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetEngine = void 0;
class BudgetEngine {
    static calculateCategoryStatus(categories, transactions) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        // Filter expense transactions for current month
        const currentMonthExpenses = transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth));
        return categories.map((cat) => {
            const spent = currentMonthExpenses
                .filter((tx) => tx.category === cat.category)
                .reduce((sum, tx) => sum + tx.amount, 0);
            const limit = cat.limit;
            const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const remaining = Math.max(0, limit - spent);
            let status = 'NORMAL';
            let alertMessage;
            if (percentage >= 100) {
                status = 'EXCEEDED';
                alertMessage = `🚨 ${cat.category} budget exceeded.`;
            }
            else if (percentage >= 85) {
                status = 'WARNING';
                alertMessage = `⚠️ You've used ${percentage}% of your ${cat.category} budget.`;
            }
            else if (percentage >= 70) {
                status = 'CAUTION';
            }
            return {
                category: cat.category,
                limit,
                spent,
                remaining,
                percentage,
                status,
                alertMessage,
            };
        });
    }
    static getOverallBudgetAdherence(categoryStatuses) {
        if (categoryStatuses.length === 0)
            return 100;
        const totalLimit = categoryStatuses.reduce((acc, c) => acc + c.limit, 0);
        const totalSpent = categoryStatuses.reduce((acc, c) => acc + c.spent, 0);
        if (totalLimit === 0)
            return 100;
        const ratio = totalSpent / totalLimit;
        if (ratio <= 1) {
            return Math.round((1 - ratio) * 100);
        }
        return Math.max(0, Math.round(100 - (ratio - 1) * 100));
    }
}
exports.BudgetEngine = BudgetEngine;
