const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middlewares/auth');


router.post('/create', verifyToken, paymentController.createPayment);


router.get('/vnpay-ipn', paymentController.vnpayIPN);


router.get('/vnpay-return', paymentController.vnpayReturn);


router.post('/vnpay-return', paymentController.updatePaymentStatus);


router.get('/:orderId/status', verifyToken, paymentController.checkPaymentStatus);

module.exports = router;
