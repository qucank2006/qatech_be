const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken, verifyAdmin } = require("../middlewares/auth");


router.get("/", verifyToken, verifyAdmin, userController.getAllUsers);


router.post("/", verifyToken, verifyAdmin, userController.createUser);


router.get("/:userId", verifyToken, verifyAdmin, userController.getUserById);


router.put("/:userId", verifyToken, verifyAdmin, userController.updateUser);


router.patch("/:userId/role", verifyToken, verifyAdmin, userController.updateUserRole);


router.patch("/:userId/status", verifyToken, verifyAdmin, userController.updateUserStatus);


router.delete("/:userId", verifyToken, verifyAdmin, userController.deleteUser);

module.exports = router;
