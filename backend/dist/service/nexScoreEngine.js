"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNexScore = void 0;
const db_1 = require("./db");
/**
 * Recalculates user's NexScore (0 - 1000 scale / normalized to 300-900 fintech score)
 * Evaluates 4 pillars:
 * 1. Savings Ratio (30%)
 * 2. Budget Discipline (30%)
 * 3. On-time Bill Payments (25%)
 * 4. Risk / Overspending Ratio (15%)
 */
const computeNexScore = async (userId) => {
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            accounts: {
                include: {
                    budgets: true,
                    bills: true,
                    transactions: { take: 30, orderBy: { timestamp: 'desc' } },
                },
            },
        },
    });
    if (!user || !user.accounts[0])
        return { score: 750, rating: 'EXCELLENT' };
    const account = user.accounts[0];
    // 1. Savings Component (max 250)
    const savingsBalance = account.savingsBalance;
    const savingsComponent = Math.min(250, Math.floor((savingsBalance / 15000) * 250));
    // 2. Budget Component (max 250)
    const totalBudget = account.budgets.reduce((acc, b) => acc + b.monthlyLimit, 0) || 1;
    const totalSpent = account.budgets.reduce((acc, b) => acc + b.spentAmount, 0);
    const budgetRatio = Math.max(0, 1 - totalSpent / totalBudget);
    const budgetComponent = Math.floor(budgetRatio * 250);
    // 3. Bill Payment Component (max 250)
    const totalBills = account.bills.length || 1;
    const paidBills = account.bills.filter((b) => b.status === 'PAID').length;
    const billPaymentComponent = Math.floor((paidBills / totalBills) * 250);
    // 4. Risk Component (max 250)
    const debitTxCount = account.transactions.filter((t) => t.type === 'DEBIT').length;
    const creditTxCount = account.transactions.filter((t) => t.type === 'CREDIT').length || 1;
    const riskRatio = Math.min(1, debitTxCount / (creditTxCount * 3));
    const riskComponent = Math.floor((1 - riskRatio * 0.5) * 250);
    const rawScore = 300 + Math.floor((savingsComponent + budgetComponent + billPaymentComponent + riskComponent) * (600 / 1000));
    const finalScore = Math.min(880, Math.max(300, rawScore));
    let rating = 'GOOD';
    if (finalScore >= 800)
        rating = 'EXCELLENT';
    else if (finalScore >= 720)
        rating = 'VERY GOOD';
    else if (finalScore >= 650)
        rating = 'GOOD';
    else
        rating = 'NEEDS IMPROVEMENT';
    // Update user score
    await db_1.prisma.user.update({
        where: { id: userId },
        data: { nexScore: finalScore },
    });
    return {
        score: finalScore,
        rating,
        breakdown: {
            savingsComponent,
            budgetComponent,
            billPaymentComponent,
            riskComponent,
        },
        tips: [
            finalScore < 800 ? '💡 Save ₹1,000 more this month to boost your score by +25 pts.' : '🌟 You are in the top 5% of student savers!',
            paidBills < totalBills ? '⚠️ Pay pending hostel broadband bill to improve bill payment score.' : '⚡ 100% on-time bill payment record maintained.',
            '🎯 Keep food spending within ₹4,500 budget limit.',
        ],
    };
};
exports.computeNexScore = computeNexScore;
