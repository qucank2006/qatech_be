const crypto = require('crypto');
const querystring = require('querystring');
const vnpayConfig = require('../config/vnpay');
const Order = require('../models/Order');

// Helper function: Sắp xếp object theo key (VNPay yêu cầu)
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach(key => {
    sorted[key] = obj[key];
  });
  return sorted;
}

// Helper function: Tạo secure hash cho VNPay
function createSecureHash(data, secretKey) {
  const sortedData = sortObject(data);
  // VNPay yêu cầu: chuỗi hash KHÔNG encode, chỉ nối key=value&key=value
  const signData = new URLSearchParams(sortedData).toString();
  const hmac = crypto.createHmac('sha512', secretKey);
  return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
}

// Tạo URL thanh toán VNPay
exports.createPayment = async (req, res) => {
  try {
    const { orderId, bankCode } = req.body;
    const userId = req.user.id;

    // Tìm đơn hàng
    const order = await Order.findOne({
      where: { id: orderId, userId }
    });

    if (!order) {
      return res.status(404).json({ msg: 'Đơn hàng không tồn tại' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ msg: 'Đơn hàng không thể thanh toán' });
    }

    // Lấy IP address
    const ipAddr = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    // Tạo thời gian theo múi giờ Việt Nam (GMT+7)
    const createDate = new Date();
    const vnp_CreateDate = createDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3$1$2$4$5$6');
    
    // Thời gian hết hạn: 15 phút
    const expireDate = new Date(createDate.getTime() + 15 * 60000);
    const vnp_ExpireDate = expireDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3$1$2$4$5$6');

    // Tạo mã giao dịch duy nhất
    const vnp_TxnRef = `${orderId}_${Date.now()}`;

    // Build VNPay parameters
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnpayConfig.vnp_TmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: vnp_TxnRef,
      vnp_OrderInfo: `Order${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(order.totalAmount) * 100, // VNPay yêu cầu nhân 100
      vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: vnp_CreateDate,
      vnp_ExpireDate: vnp_ExpireDate
    };

    // Thêm bankCode nếu có
    if (bankCode) {
      vnp_Params.vnp_BankCode = bankCode;
    }

    // Sắp xếp parameters
    vnp_Params = sortObject(vnp_Params);
    
    // Tạo secure hash (KHÔNG bao gồm vnp_SecureHash)
    const secureHash = createSecureHash(vnp_Params, vnpayConfig.vnp_HashSecret);
    
    // Tạo URL thanh toán với hash và hash type
    const paymentUrl = vnpayConfig.vnp_Url + '?' + 
      new URLSearchParams(vnp_Params).toString() + 
      '&vnp_SecureHash=' + secureHash;

    // Lưu thông tin giao dịch vào order
    await order.update({
      transactionId: vnp_TxnRef
    });

    res.status(200).json({
      msg: 'Tạo thanh toán thành công',
      paymentUrl,
      vnp_TxnRef
    });

  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// IPN URL - Webhook nhận thông báo từ VNPay (Server to Server)
exports.vnpayIPN = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    // Xóa các tham số không cần thiết
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // Sắp xếp params
    vnp_Params = sortObject(vnp_Params);

    // Verify secure hash
    const checkHash = createSecureHash(vnp_Params, vnpayConfig.vnp_HashSecret);

    if (secureHash !== checkHash) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const vnp_TxnRef = vnp_Params['vnp_TxnRef'];
    const vnp_Amount = vnp_Params['vnp_Amount'] / 100; // Chia 100 để lấy số tiền thực
    const vnp_ResponseCode = vnp_Params['vnp_ResponseCode'];
    const vnp_TransactionNo = vnp_Params['vnp_TransactionNo'];
    const vnp_BankCode = vnp_Params['vnp_BankCode'];
    const vnp_PayDate = vnp_Params['vnp_PayDate'];

    // Lấy orderId từ TxnRef
    const orderId = vnp_TxnRef.split('_')[0];

    // Tìm đơn hàng
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiểm tra số tiền
    if (Math.round(order.totalAmount) !== vnp_Amount) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // Kiểm tra trạng thái đơn hàng (tránh xử lý trùng)
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    // Cập nhật trạng thái đơn hàng
    if (vnp_ResponseCode === '00') {
      // Thanh toán thành công
      // Cập nhật statusHistory
      const statusHistory = order.statusHistory || [];
      statusHistory.push({
        status: 'paid',
        updatedBy: 'vnpay',
        note: 'Thanh toán VNPay thành công',
        updatedAt: new Date()
      });

      await order.update({
        status: 'paid',
        paymentMethod: 'vnpay',
        paymentStatus: 'paid',
        transactionId: vnp_TransactionNo,
        paidAt: new Date(),
        statusHistory
      });

      console.log(`✅ Order #${orderId} paid successfully via VNPay`);
      return res.status(200).json({ RspCode: '00', Message: 'Success' });

    } else {
      // Thanh toán thất bại
      await order.update({
        paymentStatus: 'failed'
      });

      console.log(`❌ Order #${orderId} payment failed. Code: ${vnp_ResponseCode}`);
      return res.status(200).json({ RspCode: '00', Message: 'Success' });
    }

  } catch (err) {
    console.error('Error processing VNPay IPN:', err);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

// Return URL - Trang hiển thị kết quả cho khách hàng
exports.vnpayReturn = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    // Xóa các tham số không cần thiết
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // Sắp xếp params
    vnp_Params = sortObject(vnp_Params);

    // Verify secure hash
    const checkHash = createSecureHash(vnp_Params, vnpayConfig.vnp_HashSecret);

    if (secureHash !== checkHash) {
      return res.status(400).json({ msg: 'Chữ ký không hợp lệ' });
    }

    const vnp_TxnRef = vnp_Params['vnp_TxnRef'];
    const vnp_ResponseCode = vnp_Params['vnp_ResponseCode'];
    const vnp_TransactionNo = vnp_Params['vnp_TransactionNo'];
    const orderId = vnp_TxnRef.split('_')[0];

    // Tìm đơn hàng
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ msg: 'Đơn hàng không tồn tại' });
    }

    // Trả về kết quả
    if (vnp_ResponseCode === '00') {
      res.status(200).json({
        msg: 'Thanh toán thành công',
        success: true,
        orderId: order.id,
        transactionNo: vnp_TransactionNo,
        amount: order.totalAmount
      });
    } else {
      // Lấy thông báo lỗi
      const errorMessages = {
        '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ gian lận',
        '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
        '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
        '11': 'Đã hết hạn chờ thanh toán',
        '12': 'Thẻ/Tài khoản bị khóa',
        '13': 'Sai mật khẩu xác thực giao dịch (OTP)',
        '24': 'Khách hàng hủy giao dịch',
        '51': 'Tài khoản không đủ số dư',
        '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
        '75': 'Ngân hàng thanh toán đang bảo trì',
        '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
        '99': 'Lỗi không xác định'
      };

      res.status(400).json({
        msg: 'Thanh toán thất bại',
        success: false,
        orderId: order.id,
        errorCode: vnp_ResponseCode,
        errorMessage: errorMessages[vnp_ResponseCode] || 'Giao dịch không thành công'
      });
    }

  } catch (err) {
    console.error('Error processing VNPay return:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// Kiểm tra trạng thái thanh toán
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id: orderId, userId }
    });

    if (!order) {
      return res.status(404).json({ msg: 'Đơn hàng không tồn tại' });
    }

    res.status(200).json({
      msg: 'Trạng thái thanh toán',
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        transactionId: order.transactionId,
        paidAt: order.paidAt
      }
    });

  } catch (err) {
    console.error('Error checking payment status:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// Frontend callback - Cập nhật trạng thái sau khi VNPay redirect
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { vnp_ResponseCode, vnp_TxnRef, vnp_TransactionNo, orderId } = req.body;

    // Lấy orderId từ TxnRef nếu không có orderId
    const orderIdFinal = orderId || (vnp_TxnRef ? vnp_TxnRef.split('_')[0] : null);

    if (!orderIdFinal) {
      return res.status(400).json({ msg: 'Thiếu thông tin đơn hàng' });
    }

    const order = await Order.findByPk(orderIdFinal);

    if (!order) {
      return res.status(404).json({ msg: 'Đơn hàng không tồn tại' });
    }

    // Chỉ cập nhật nếu chưa được cập nhật
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ 
        success: true, 
        msg: 'Đơn hàng đã được cập nhật trước đó',
        order: {
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      });
    }

    if (vnp_ResponseCode === '00') {
      // Cập nhật statusHistory
      const statusHistory = order.statusHistory || [];
      statusHistory.push({
        status: 'paid',
        updatedBy: 'vnpay',
        note: 'Thanh toán VNPay thành công',
        updatedAt: new Date()
      });

      await order.update({
        status: 'paid',
        paymentStatus: 'paid',
        transactionId: vnp_TransactionNo || order.transactionId,
        paidAt: new Date(),
        statusHistory
      });

      console.log(`✅ Order #${orderIdFinal} updated to paid via frontend callback`);

      return res.status(200).json({ 
        success: true, 
        msg: 'Cập nhật thanh toán thành công',
        order: {
          id: order.id,
          status: 'paid',
          paymentStatus: 'paid',
          transactionId: vnp_TransactionNo
        }
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        msg: 'Thanh toán không thành công',
        errorCode: vnp_ResponseCode
      });
    }

  } catch (err) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};
