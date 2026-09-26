"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNexScoreHandler = void 0;
const db_1 = require("../services/db");
const nexScoreEngine_1 = require("../services/nexScoreEngine");
const getNexScoreHandler = async (req, res) => {
    try {
        const scoreData = await (0, nexScoreEngine_1.computeNexScore)(req.userId);
        const history = await db_1.prisma.nexScoreHistory.findMany({
            where: { userId: req.userId },
            orderBy: { date: 'asc' },
        });
        return res.json({
            ...scoreData,
            history,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getNexScoreHandler = getNexScoreHandler;
