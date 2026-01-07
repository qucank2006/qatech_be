const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { verifyToken, verifyAdmin } = require("../middlewares/auth");

// Dashboard statistics (chỉ admin)
router.get("/", verifyToken, verifyAdmin, dashboardController.getDashboardStats);

module.exports = router;
