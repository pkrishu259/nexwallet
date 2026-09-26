"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInsights = void 0;
const mockData_1 = require("../data/mockData");
const insightEngine_1 = require("../services/insightEngine");
const getInsights = (req, res) => {
    const insights = insightEngine_1.InsightEngine.generateInsights(mockData_1.mockUser.id, mockData_1.mockBudgetPlan, mockData_1.mockTransactions, mockData_1.mockSavingsGoals);
    res.json({
        success: true,
        insights,
    });
};
exports.getInsights = getInsights;
