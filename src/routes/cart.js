const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { verifyToken } = require("../middlewares/auth");



router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.post("/add-multiple", cartController.addMultipleToCart);
router.put("/:productId", cartController.updateCartItem);
router.delete("/:productId", cartController.removeFromCart);
router.delete("/", cartController.clearCart);

module.exports = router;

