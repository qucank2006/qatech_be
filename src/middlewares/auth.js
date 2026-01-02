const jwt = require("jsonwebtoken");

// Xác thực token JWT
exports.auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ msg: "Không có token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token không hợp lệ" });
  }
};

// Kiểm tra quyền Admin
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Bạn không có quyền Admin" });
  }
  next();
};
