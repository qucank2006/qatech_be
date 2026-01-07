const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middlewares/auth');

// Tạo thanh toán VNPay (yêu cầu đăng nhập)
router.post('/create', verifyToken, paymentController.createPayment);

// IPN URL - Webhook nhận thông báo từ VNPay (Server to Server - không cần auth)
router.get('/vnpay-ipn', paymentController.vnpayIPN);

// Return URL - Trang kết quả thanh toán cho khách hàng (không cần auth)
router.get('/vnpay-return', paymentController.vnpayReturn);

// Frontend callback - Cập nhật trạng thái sau khi VNPay redirect (không cần auth vì user vừa redirect về)
router.post('/vnpay-return', paymentController.updatePaymentStatus);

// Kiểm tra trạng thái thanh toán
router.get('/:orderId/status', verifyToken, paymentController.checkPaymentStatus);

module.exports = router;
