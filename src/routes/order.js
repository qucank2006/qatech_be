const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken, verifyAdmin, employeeOrderManagement } = require("../middlewares/auth");

// User routes (yêu cầu đăng nhập)
router.post("/", verifyToken, orderController.createOrder);
router.get("/my-orders", verifyToken, orderController.getUserOrders);
router.put("/:orderId/cancel", verifyToken, orderController.cancelOrder);
router.get("/:orderId", verifyToken, orderController.getOrderById);

// Admin/Employee routes
router.get("/", verifyToken, employeeOrderManagement, orderController.getAllOrders);
router.put("/:orderId/status", verifyToken, employeeOrderManagement, orderController.updateOrderStatus);

// Admin only: Statistics
router.get("/statistics/summary", verifyToken, verifyAdmin, orderController.getStatistics);

module.exports = router;
