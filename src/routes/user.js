const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken, verifyAdmin } = require("../middlewares/auth");

// Get all users (admin only)
router.get("/", verifyToken, verifyAdmin, userController.getAllUsers);

// Get user by ID (admin only)
router.get("/:userId", verifyToken, verifyAdmin, userController.getUserById);

// Update user role (admin only)
router.patch("/:userId/role", verifyToken, verifyAdmin, userController.updateUserRole);

// Update user status (admin only)
router.patch("/:userId/status", verifyToken, verifyAdmin, userController.updateUserStatus);

// Delete user (admin only)
router.delete("/:userId", verifyToken, verifyAdmin, userController.deleteUser);

module.exports = router;
