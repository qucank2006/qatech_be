const router = require("express").Router();
const productController = require("../controllers/productController");
const { auth, adminOnly } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.post("/", auth, adminOnly, upload.array("images", 10), productController.createProduct);
router.put("/:id", auth, adminOnly, upload.array("images", 10), productController.updateProduct);
router.delete("/:id", auth, adminOnly, productController.deleteProduct);

module.exports = router;
