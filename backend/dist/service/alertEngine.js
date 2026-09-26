"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertEngine = void 0;
const budgetEngine_1 = require("./budgetEngine");
const behaviourEngine_1 = require("./behaviourEngine");
class AlertEngine {
    static evaluateAlerts(userId, budgetPlan, transactions, currentAlerts) {
        const newAlerts = [...currentAlerts];
        const categoryStatuses = budgetEngine_1.BudgetEngine.calculateCategoryStatus(budgetPlan.categories, transactions);
        // Budget limit & warning alerts
        categoryStatuses.forEach((status) => {
            if (status.status === 'EXCEEDED') {
                const title = `${status.category} Budget Exceeded`;
                const message = `🚨 ${status.category} budget exceeded. Spent ₹${status.spent} of ₹${status.limit}.`;
                if (!newAlerts.some((a) => a.title === title && !a.read)) {
                    newAlerts.unshift({
                        id: `alert-budget-exceeded-${status.category}-${Date.now()}`,
                        userId,
                        type: 'BUDGET_EXCEEDED',
                        severity: 'CRITICAL',
                        title,
                        message,
                        read: false,
                        createdAt: new Date().toISOString(),
                    });
                }
            }
            else if (status.status === 'WARNING') {
                const title = `${status.category} Budget Warning`;
                const message = `⚠️ You've used ${status.percentage}% of your ${status.category} budget.`;
                if (!newAlerts.some((a) => a.title === title && !a.read)) {
                    newAlerts.unshift({
                        id: `alert-budget-warning-${status.category}-${Date.now()}`,
                        userId,
                        type: 'BUDGET_WARNING',
                        severity: 'WARNING',
                        title,
                        message,
                        read: false,
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        });
        // Behaviour & unusual spending alerts
        const analysis = behaviourEngine_1.BehaviourEngine.analyzeUserBehaviour(budgetPlan, transactions, 2000, 2000);
        if (analysis.unusualTransactions.length > 0) {
            const latestUnusual = analysis.unusualTransactions[0];
            const title = `Unusual Spending Detected`;
            const message = `⚡ High expense of ₹${latestUnusual.amount} on ${latestUnusual.description} (${latestUnusual.category}).`;
            if (!newAlerts.some((a) => a.title === title && !a.read)) {
                newAlerts.unshift({
                    id: `alert-unusual-${Date.now()}`,
                    userId,
                    type: 'UNUSUAL_SPENDING',
                    severity: 'WARNING',
                    title,
                    message,
                    read: false,
                    createdAt: new Date().toISOString(),
                });
            }
        }
        return newAlerts;
    }
}
exports.AlertEngine = AlertEngine;
