const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PasswordReset = require("../models/PasswordReset");
const nodemailer = require("nodemailer");

// ----- ĐĂNG KÝ -----
exports.register = async ({ name, email, password }) => {
  // Check email tồn tại
  const exist = await User.findOne({ where: { email } });
  if (exist) {
    return { status: 400, msg: "Email đã tồn tại" };
  }

  // Hash password
  const hashPass = await bcrypt.hash(password, 10);

  // Tạo user mới
  const user = await User.create({
    name,
    email,
    password: hashPass,
  });

  return { status: 201, msg: "Đăng ký thành công", user };
};


// ----- ĐĂNG NHẬP -----
exports.login = async ({ email, password }) => {
  // Tìm user theo email
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return { status: 400, msg: "Email hoặc mật khẩu không chính xác" };
  }

  // So sánh mật khẩu
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { status: 400, msg: "Email hoặc mật khẩu không chính xác" };
  }

  // Tạo token
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    status: 200,
    msg: "Đăng nhập thành công",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// ----- QUÊN MẬT KHẨU -----
exports.createOTP = async (email) => {
  // 1) Tạo OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2) Thời gian hết hạn (5 phút)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 3) Lưu vào DB
  await PasswordReset.create({
    email,
    otp,
    expiresAt
  });

  // 4) Tạo transporter để gửi email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  // 5) Gửi email
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Mã khôi phục mật khẩu QATech",
    text: `Mã OTP của bạn là ${otp}. Mã có hiệu lực trong 5 phút.`,
  });

  return {
    status: 200,
    msg: "OTP đã được gửi qua email",
    otp // giữ lại để test FE, sau này xóa
  };
};
// verify OTP
exports.verifyOTP = async (email, otp) => {
  // Tìm OTP mới nhất của email
  const record = await PasswordReset.findOne({
    where: { email, otp },
    order: [["createdAt", "DESC"]]
  });

  if (!record) {
    return { status: 400, msg: "OTP không đúng" };
  }

  // Kiểm tra hạn
  if (record.expiresAt < new Date()) {
    return { status: 400, msg: "OTP đã hết hạn" };
  }

  return { status: 200, msg: "OTP hợp lệ" };
};
// reset password
exports.resetPassword = async (email, newPassword) => {
  // Hash mật khẩu mới
  const bcrypt = require("bcryptjs");
  const hashed = await bcrypt.hash(newPassword, 10);

  // Update DB
  await User.update(
    { password: hashed },
    { where: { email } }
  );

  return {
    status: 200,
    msg: "Đổi mật khẩu thành công"
  };
};
