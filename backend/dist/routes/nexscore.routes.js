"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nexscore_controller_1 = require("../controllers/nexscore.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateJwt);
router.get('/', nexscore_controller_1.getNexScoreHandler);
exports.default = router;
