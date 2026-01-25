const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PasswordReset = require("../models/PasswordReset");
const nodemailer = require("nodemailer");


// Đăng ký tài khoản mới
exports.register = async ({ name, email, password }) => {
  const exist = await User.findOne({ where: { email } });
  if (exist) {
    return { status: 400, msg: "Email đã tồn tại" };
  }

  const hashPass = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashPass });

  return { status: 201, msg: "Đăng ký thành công", user };
};


// Đăng nhập
exports.login = async ({ email, password, remember }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return { status: 400, msg: "Email hoặc mật khẩu không chính xác" };
  }


  if (user.isActive === false) {
    return { status: 403, msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên." };
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { status: 400, msg: "Email hoặc mật khẩu không chính xác" };
  }

  const expiresIn = remember ? "7d" : "1d";
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
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
      phone: user.phone,
      address: user.address,
      avatar: user.avatar
    },
  };
};


// Tạo và gửi mã OTP qua email
exports.createOTP = async (email) => {

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return { status: 404, msg: "Email không tồn tại" };
  }
  
  if (user.isActive === false) {
    return { status: 403, msg: "Tài khoản của bạn đã bị khóa. Không thể tạo mã OTP." };
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await PasswordReset.create({ email, otp, expiresAt });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });
  const htmlContent = `
    <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
      <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">QATech</a>
        </div>
        <p style="font-size:1.1em">Xin chào,</p>
        <p>Sử dụng mã OTP sau để hoàn tất thủ tục khôi phục mật khẩu của bạn. Mã có hiệu lực trong 5 phút.</p>
        <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
        <p style="font-size:0.9em;">Xin cảm ơn,<br />QATech Team</p>
        <hr style="border:none;border-top:1px solid #eee" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          <p>QATech Inc</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Mã khôi phục mật khẩu QATech",
    html: htmlContent,
  });

  return {
    status: 200,
    msg: "OTP đã được gửi qua email",
  };
};


// Xác nhận mã OTP
exports.verifyOTP = async (email, otp) => {
  const record = await PasswordReset.findOne({
    where: { email, otp },
    order: [["createdAt", "DESC"]]
  });

  if (!record) return { status: 400, msg: "OTP không đúng" };
  if (record.expiresAt < new Date()) return { status: 400, msg: "OTP đã hết hạn" };

  return { status: 200, msg: "OTP hợp lệ" };
};


// Đặt lại mật khẩu mới
exports.resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    return { status: 404, msg: "Email không tồn tại" };
  }
  

  if (user.isActive === false) {
    return { status: 403, msg: "Tài khoản của bạn đã bị khóa. Không thể đặt lại mật khẩu." };
  }
  
  const hashed = await bcrypt.hash(newPassword, 10);
  await User.update({ password: hashed }, { where: { email } });

  return { status: 200, msg: "Đổi mật khẩu thành công" };
};


// Cập nhật thông tin cá nhân
exports.updateProfile = async (userId, { name, password, phone, address, avatar }) => {
  const user = await User.findByPk(userId);
  if (!user) return { status: 404, msg: "Người dùng không tồn tại" };

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (address) updateData.address = address;
  if (avatar) updateData.avatar = avatar;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  await user.update(updateData);

  return {
    status: 200,
    msg: "Cập nhật thông tin thành công",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar
    }
  };
};
