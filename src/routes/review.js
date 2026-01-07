const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { verifyToken, verifyAdmin, employeeOrderManagement } = require("../middlewares/auth");

// Public routes
router.get("/product/:productId", reviewController.getProductReviews);

// Protected routes (yêu cầu đăng nhập)
router.get("/check-purchase/:productId", verifyToken, reviewController.checkPurchase);
router.post("/", verifyToken, reviewController.createReview);

// Admin & Employee: Reply và xóa review
router.post("/:reviewId/reply", verifyToken, employeeOrderManagement, reviewController.replyReview);
router.delete("/:reviewId", verifyToken, employeeOrderManagement, reviewController.deleteReview);

module.exports = router;
