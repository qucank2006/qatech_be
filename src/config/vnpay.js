require('dotenv').config();

const vnpayConfig = {
  vnp_TmnCode: process.env.VNPAY_TMN_CODE,
  vnp_HashSecret: process.env.VNPAY_HASH_SECRET,
  vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_Api: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/vnpay-return',
  vnp_IpnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:5000/api/payments/vnpay-ipn'
};

module.exports = vnpayConfig;
