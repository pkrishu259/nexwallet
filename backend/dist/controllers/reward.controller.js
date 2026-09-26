"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemSparksHandler = exports.scratchCardHandler = exports.getRewardsHandler = void 0;
const db_1 = require("../services/db");
const getRewardsHandler = async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { rewards: { orderBy: { createdAt: 'desc' } } },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const scratchCards = user.rewards.filter((r) => r.type === 'SCRATCH_CARD');
        const vouchers = user.rewards.filter((r) => r.type === 'VOUCHER');
        const cashbacks = user.rewards.filter((r) => r.type === 'CASHBACK');
        return res.json({
            sparksPoints: user.sparksPoints,
            scratchCards,
            vouchers,
            cashbacks,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getRewardsHandler = getRewardsHandler;
const scratchCardHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const reward = await db_1.prisma.reward.findUnique({ where: { id } });
        if (!reward || reward.userId !== req.userId) {
            return res.status(404).json({ error: 'Scratch card not found' });
        }
        if (reward.isClaimed) {
            return res.status(400).json({ error: 'Scratch card already claimed' });
        }
        // Amount revealed (if 0, randomize between ₹10 and ₹150)
        const cashbackWon = reward.amount > 0 ? reward.amount : Math.floor(10 + Math.random() * 140);
        const sparksWon = 25;
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        const account = user.accounts[0];
        // Credit cashback to wallet balance & mark claimed
        const [updatedReward, updatedAccount] = await db_1.prisma.$transaction([
            db_1.prisma.reward.update({
                where: { id },
                data: {
                    isClaimed: true,
                    amount: cashbackWon,
                    points: sparksWon,
                },
            }),
            db_1.prisma.account.update({
                where: { id: account.id },
                data: { walletBalance: { increment: cashbackWon } },
            }),
            db_1.prisma.user.update({
                where: { id: req.userId },
                data: { sparksPoints: { increment: sparksWon } },
            }),
            db_1.prisma.transaction.create({
                data: {
                    accountId: account.id,
                    type: 'CREDIT',
                    amount: cashbackWon,
                    category: 'Cashback',
                    merchantName: 'NexWallet Scratch Card Reward',
                    description: `You won ₹${cashbackWon} cashback & ${sparksWon} Sparks!`,
                    upiRef: 'REWARD/' + Math.floor(100000000000 + Math.random() * 900000000000),
                    status: 'SUCCESS',
                    sparksEarned: sparksWon,
                },
            }),
        ]);
        return res.json({
            message: `🎉 You won ₹${cashbackWon} Cashback & ${sparksWon} Sparks Points!`,
            cashbackWon,
            sparksWon,
            reward: updatedReward,
            newWalletBalance: updatedAccount.walletBalance,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.scratchCardHandler = scratchCardHandler;
const redeemSparksHandler = async (req, res) => {
    try {
        const { pointsToRedeem } = req.body;
        if (!pointsToRedeem || pointsToRedeem < 100) {
            return res.status(400).json({ error: 'Minimum 100 Sparks points required for redemption' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            include: { accounts: true },
        });
        if (!user || !user.accounts[0])
            return res.status(404).json({ error: 'Account not found' });
        if (user.sparksPoints < pointsToRedeem) {
            return res.status(400).json({ error: 'Insufficient Sparks points balance' });
        }
        // Rate: 100 Sparks = ₹25 wallet cash
        const cashValue = (pointsToRedeem / 100) * 25.0;
        const [updatedUser, updatedAccount] = await db_1.prisma.$transaction([
            db_1.prisma.user.update({
                where: { id: user.id },
                data: { sparksPoints: { decrement: pointsToRedeem } },
            }),
            db_1.prisma.account.update({
                where: { id: user.accounts[0].id },
                data: { walletBalance: { increment: cashValue } },
            }),
            db_1.prisma.transaction.create({
                data: {
                    accountId: user.accounts[0].id,
                    type: 'CREDIT',
                    amount: cashValue,
                    category: 'Cashback',
                    merchantName: 'Sparks Points Conversion',
                    description: `Redeemed ${pointsToRedeem} Sparks for ₹${cashValue} wallet cash`,
                    upiRef: 'SPARKS/' + Math.floor(100000000000 + Math.random() * 900000000000),
                    status: 'SUCCESS',
                    sparksEarned: 0,
                },
            }),
        ]);
        return res.json({
            message: `Successfully redeemed ${pointsToRedeem} Sparks for ₹${cashValue} wallet cash!`,
            cashValue,
            remainingSparks: updatedUser.sparksPoints,
            newWalletBalance: updatedAccount.walletBalance,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.redeemSparksHandler = redeemSparksHandler;
