const jwt = require("jsonwebtoken");

// Xác thực token JWT
exports.auth = (req, res, next) => {
  const header = req.headers.authorization;
  
  if (!header) {
    return res.status(401).json({ msg: "Không có token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Token đã hết hạn, vui lòng đăng nhập lại'
      : 'Token không hợp lệ';
    res.status(401).json({ msg: message });
  }
};

// Alias cho auth
exports.verifyToken = exports.auth;

// Kiểm tra quyền Admin
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Bạn không có quyền Admin" });
  }
  next();
};

// Alias cho adminOnly
exports.verifyAdmin = exports.adminOnly;

// Kiểm tra quyền Admin hoặc Employee
exports.adminOrEmployee = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "employee") {
    return res.status(403).json({ msg: "Access denied. Admin or Employee only." });
  }
  next();
};

// Alias cho adminOrEmployee (dùng cho quản lý đơn hàng)
exports.employeeOrderManagement = exports.adminOrEmployee;
