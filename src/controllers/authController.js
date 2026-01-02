const authService = require("../services/authService");

// Đăng ký tài khoản mới
exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// Tạo và gửi mã OTP qua email
exports.createOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.createOTP(email);
    res.status(result.status).json(result);
  } catch (error) {
    res.status(500).json({ msg: "Lỗi server" });
  }
};

// Xác nhận mã OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOTP(email, otp);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server" });
  }
};

// Đặt lại mật khẩu mới
exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.resetPassword(email, password);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server" });
  }
};

// Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, password, phone, address } = req.body;
    const avatar = req.file ? req.file.filename : null;
    
    const result = await authService.updateProfile(userId, { name, password, phone, address, avatar });
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};
