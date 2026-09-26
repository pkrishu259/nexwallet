"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimDailyInterestReward = exports.calculateDailyInterest = void 0;
const db_1 = require("./db");
/**
 * Calculates daily interest earned on Savings Balance based on RBI Repo Rate (6.5% p.a.)
 * Formula: Daily Interest = Savings Balance * (Repo Rate / 100) / 365
 */
const calculateDailyInterest = (savingsBalance, repoRate = 6.5) => {
    const annualInterest = savingsBalance * (repoRate / 100.0);
    const dailyInterest = annualInterest / 365.0;
    return {
        annualInterest: Number(annualInterest.toFixed(2)),
        dailyInterest: Number(dailyInterest.toFixed(2)),
        monthlyProjected: Number((dailyInterest * 30).toFixed(2)),
        repoRate,
    };
};
exports.calculateDailyInterest = calculateDailyInterest;
const claimDailyInterestReward = async (accountId) => {
    const account = await db_1.prisma.account.findUnique({ where: { id: accountId } });
    if (!account)
        throw new Error('Account not found');
    const { dailyInterest } = (0, exports.calculateDailyInterest)(account.savingsBalance, account.repoRate);
    if (dailyInterest <= 0)
        return { credited: 0 };
    // Update savings balance and interest earned
    const updatedAccount = await db_1.prisma.account.update({
        where: { id: accountId },
        data: {
            savingsBalance: { increment: dailyInterest },
            totalInterestEarned: { increment: dailyInterest },
        },
    });
    // Create ledger transaction entry
    await db_1.prisma.transaction.create({
        data: {
            accountId,
            type: 'CREDIT',
            amount: dailyInterest,
            category: 'Interest',
            merchantName: 'NexWallet RBI Savings Interest',
            description: `Daily payout calculated @ ${account.repoRate}% RBI Repo Rate`,
            upiRef: `INT/${Date.now()}`,
            status: 'SUCCESS',
            sparksEarned: 0,
        },
    });
    return {
        credited: dailyInterest,
        newSavingsBalance: updatedAccount.savingsBalance,
        totalInterestEarned: updatedAccount.totalInterestEarned,
    };
};
exports.claimDailyInterestReward = claimDailyInterestReward;
