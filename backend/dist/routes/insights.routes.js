"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insight_controller_1 = require("../controllers/insight.controller");
const router = (0, express_1.Router)();
router.get('/', insight_controller_1.getInsights);
exports.default = router;
