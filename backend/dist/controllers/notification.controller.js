"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllReadHandler = exports.markNotificationReadHandler = exports.getNotificationsHandler = void 0;
const db_1 = require("../services/db");
const getNotificationsHandler = async (req, res) => {
    try {
        const notifications = await db_1.prisma.notification.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        return res.json({
            notifications,
            unreadCount,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getNotificationsHandler = getNotificationsHandler;
const markNotificationReadHandler = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return res.json({ message: 'Notification marked as read' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.markNotificationReadHandler = markNotificationReadHandler;
const markAllReadHandler = async (req, res) => {
    try {
        await db_1.prisma.notification.updateMany({
            where: { userId: req.userId, isRead: false },
            data: { isRead: true },
        });
        return res.json({ message: 'All notifications marked as read' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.markAllReadHandler = markAllReadHandler;
