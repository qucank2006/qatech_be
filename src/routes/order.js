const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken, verifyAdmin, employeeOrderManagement } = require("../middlewares/auth");


router.post("/", verifyToken, orderController.createOrder);
router.get("/my-orders", verifyToken, orderController.getUserOrders);
router.put("/:orderId/cancel", verifyToken, orderController.cancelOrder);
router.get("/:orderId", verifyToken, orderController.getOrderById);


router.get("/", verifyToken, employeeOrderManagement, orderController.getAllOrders);
router.put("/:orderId/status", verifyToken, employeeOrderManagement, orderController.updateOrderStatus);


router.get("/statistics/summary", verifyToken, verifyAdmin, orderController.getStatistics);

module.exports = router;
