const router = require("express").Router();
const auth = require("../controllers/authController");
const { auth: authMiddleware } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/request-otp", auth.createOTP);
router.post("/verify-otp", auth.verifyOTP);
router.post("/reset-password", auth.resetPassword);
router.put("/profile", authMiddleware, upload.single("avatar"), auth.updateProfile);

module.exports = router;
