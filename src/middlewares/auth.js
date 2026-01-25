const jwt = require("jsonwebtoken");
const User = require("../models/User");


// Xác thực token JWT
exports.auth = async (req, res, next) => {
  const header = req.headers.authorization;
  
  if (!header) {
    return res.status(401).json({ msg: "Không có token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ msg: "Tài khoản không tồn tại" });
    }
    
    if (user.isActive === false) {
      return res.status(403).json({ msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên." });
    }
    
    req.user = decoded;
    req.userData = user;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Token đã hết hạn, vui lòng đăng nhập lại'
      : 'Token không hợp lệ';
    res.status(401).json({ msg: message });
  }
};


// Xác thực token JWT
exports.verifyToken = exports.auth;


// Kiểm tra quyền Admin
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Bạn không có quyền Admin" });
  }
  next();
};


// Kiểm tra quyền Admin
exports.verifyAdmin = exports.adminOnly;


// Kiểm tra quyền Admin hoặc Employee
exports.adminOrEmployee = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "employee") {
    return res.status(403).json({ msg: "Access denied. Admin or Employee only." });
  }
  next();
};


// Kiểm tra quyền quản lý đơn hàng
exports.employeeOrderManagement = exports.adminOrEmployee;
