"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavingsEngine = void 0;
class SavingsEngine {
    static calculateGoalProgress(goal) {
        const percentage = goal.targetAmount > 0
            ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
            : 0;
        const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
        const monthsToGoal = goal.monthlyContribution > 0
            ? Math.ceil(remainingAmount / goal.monthlyContribution)
            : 0;
        return {
            percentage,
            remainingAmount,
            monthsToGoal,
            isCompleted: goal.currentAmount >= goal.targetAmount,
        };
    }
    static simulateAutoSavings(monthlyIncome, monthlyContribution, goals, projectionMonths = 12) {
        const totalSaved = monthlyContribution * projectionMonths;
        const breakdownByGoal = goals.map((goal) => {
            const projected = Math.min(goal.targetAmount, goal.currentAmount + goal.monthlyContribution * projectionMonths);
            return {
                goalName: goal.name,
                projectedAmount: projected,
            };
        });
        return {
            months: projectionMonths,
            totalSaved,
            breakdownByGoal,
        };
    }
}
exports.SavingsEngine = SavingsEngine;
