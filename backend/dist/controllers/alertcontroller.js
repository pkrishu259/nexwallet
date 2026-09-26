"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAlertAsRead = exports.getAlerts = void 0;
const mockData_1 = require("../data/mockData");
const alertEngine_1 = require("../services/alertEngine");
const getAlerts = (req, res) => {
    const freshAlerts = alertEngine_1.AlertEngine.evaluateAlerts(mockData_1.mockUser.id, mockData_1.mockBudgetPlan, mockData_1.mockTransactions, mockData_1.mockAlerts);
    res.json({
        success: true,
        alerts: freshAlerts,
        unreadCount: freshAlerts.filter((a) => !a.read).length,
    });
};
exports.getAlerts = getAlerts;
const markAlertAsRead = (req, res) => {
    const { id } = req.params;
    const alert = mockData_1.mockAlerts.find((a) => a.id === id);
    if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found.' });
    }
    alert.read = true;
    res.json({
        success: true,
        alert,
    });
};
exports.markAlertAsRead = markAlertAsRead;
