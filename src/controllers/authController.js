const authService = require("../services/authService");

// ----- ĐĂNG KÝ -----
exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// ----- ĐĂNG NHẬP -----
exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// ----- QUÊN MẬT KHẨU -----
exports.createOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.createOTP(email);
    res.status(result.status).json(result);
  } catch (error) {
    res.status(500).json({ msg: "Lỗi server" });
  }
};

// ----- XÁC NHẬN OTP -----
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOTP(email, otp);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server" });
  }
};
// ----- ĐẶT LẠI MẬT KHẨU MỚI -----
exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.resetPassword(email, password);
    res.status(result.status).json(result);

  } catch (err) {
    res.status(500).json({ msg: "Lỗi server" });
  }
};
