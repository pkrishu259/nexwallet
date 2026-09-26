"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightEngine = void 0;
const budgetEngine_1 = require("./budgetEngine");
const behaviourEngine_1 = require("./behaviourEngine");
class InsightEngine {
    static generateInsights(userId, budgetPlan, transactions, goals) {
        const insights = [];
        const now = new Date().toISOString();
        const categoryStatuses = budgetEngine_1.BudgetEngine.calculateCategoryStatus(budgetPlan.categories, transactions);
        const warningCategory = categoryStatuses.find((c) => c.status === 'WARNING' || c.status === 'EXCEEDED');
        if (warningCategory) {
            insights.push({
                id: `insight-category-${warningCategory.category}`,
                userId,
                category: warningCategory.category,
                severity: warningCategory.status === 'EXCEEDED' ? 'CRITICAL' : 'WARNING',
                title: `${warningCategory.category} Budget Alert`,
                message: `You've used ${warningCategory.percentage}% of your ${warningCategory.category} budget. Consider reducing non-essential spending in this category.`,
                createdAt: now,
            });
        }
        const analysis = behaviourEngine_1.BehaviourEngine.analyzeUserBehaviour(budgetPlan, transactions, 2000, 2000);
        insights.push({
            id: 'insight-daily-average',
            userId,
            category: 'Overview',
            severity: 'INFO',
            title: 'Daily Spending Average',
            message: `Your average daily spending is ₹${analysis.dailyAverageSpending}. Target daily limit is ₹${analysis.dailySpendingLimit}.`,
            createdAt: now,
        });
        if (goals.length > 0) {
            const mainGoal = goals[0];
            const percent = Math.round((mainGoal.currentAmount / mainGoal.targetAmount) * 100);
            insights.push({
                id: 'insight-savings-progress',
                userId,
                category: 'Savings',
                severity: 'SUCCESS',
                title: 'Savings Goal Progress',
                message: `You are on track for "${mainGoal.name}" (${percent}% achieved: ₹${mainGoal.currentAmount} of ₹${mainGoal.targetAmount}).`,
                createdAt: now,
            });
        }
        insights.push({
            id: 'insight-health-score',
            userId,
            category: 'Health',
            severity: analysis.healthScore >= 75 ? 'SUCCESS' : 'WARNING',
            title: 'Financial Health Score',
            message: `Your current Financial Health Score is ${analysis.healthScore}/100 (${analysis.healthStatus}). Keep managing budget limits to boost your score!`,
            createdAt: now,
        });
        return insights;
    }
}
exports.InsightEngine = InsightEngine;
