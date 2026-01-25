const User = require("../models/User");
const Order = require("../models/Order");
const Review = require("../models/Review");
const { Op } = require("sequelize");


// Lấy danh sách tất cả người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role,
      isActive
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);


    const whereClause = {};


    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }


    if (role) {
      whereClause.role = role;
    }


    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }


    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      users: rows.map(user => ({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        address: user.address,
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers: count,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Cập nhật vai trò người dùng
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['customer', 'admin', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ msg: "Role không hợp lệ" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ msg: "User không tồn tại" });
    }


    if (parseInt(userId) === req.user.id && req.user.role === 'admin') {
      return res.status(400).json({ msg: "Không thể thay đổi role của chính mình" });
    }

    await user.update({ role });

    res.status(200).json({
      msg: "Cập nhật role thành công",
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Cập nhật trạng thái người dùng
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ msg: "isActive phải là boolean" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ msg: "User không tồn tại" });
    }

    await user.update({ isActive });

    res.status(200).json({
      msg: "Cập nhật trạng thái thành công",
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ msg: "User không tồn tại" });
    }


    if (user.id === req.user.id) {
      return res.status(400).json({ msg: "Không thể xóa tài khoản của chính mình" });
    }


    const orderCount = await Order.count({ where: { userId: userId } });
    if (orderCount > 0) {
      return res.status(400).json({ 
        msg: `Không thể xóa người dùng vì có ${orderCount} đơn hàng liên quan. Vui lòng vô hiệu hóa tài khoản thay vì xóa.` 
      });
    }


    const reviewCount = await Review.count({ where: { userId: userId } });
    if (reviewCount > 0) {


      await Review.destroy({ where: { userId: userId } });
    }

    await user.destroy();

    res.status(200).json({ msg: "Xóa người dùng thành công" });

  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Lấy thông tin người dùng theo ID
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ msg: "User không tồn tại" });
    }

    res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      address: user.address,
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Tạo người dùng mới
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;


    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Vui lòng điền đầy đủ thông tin (tên, email, mật khẩu)" });
    }

    const validRoles = ['customer', 'admin', 'employee'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ msg: "Role không hợp lệ" });
    }


    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ msg: "Email đã tồn tại" });
    }


    const bcrypt = require("bcryptjs");
    const hashPass = await bcrypt.hash(password, 10);


    const newUser = await User.create({
      name,
      email,
      password: hashPass,
      role: role || 'customer',
      phone: phone || null,
      address: address || null,
      isActive: true
    });

    res.status(201).json({
      msg: "Tạo người dùng thành công",
      user: {
        _id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        address: newUser.address,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });

  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Cập nhật thông tin người dùng
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, address } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ msg: "User không tồn tại" });
    }


    if (parseInt(userId) === req.user.id && email && email !== user.email) {
      return res.status(400).json({ msg: "Không thể thay đổi email của chính mình" });
    }


    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ msg: "Email đã tồn tại" });
      }
    }


    const updateData = {};
    if (name) updateData.name = name;
    if (email && email !== user.email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    await user.update(updateData);

    res.status(200).json({
      msg: "Cập nhật thông tin thành công",
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });

  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
