const User = require("../models/User");
const { Op } = require("sequelize");

// Get all users with pagination, search, and filters
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

    // Build where clause
    const whereClause = {};

    // Search by name or email
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filter by role
    if (role) {
      whereClause.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Get users with pagination
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
        isActive: user.isActive !== false, // default true if not set
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

// Update user role
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

// Update user status
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

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ msg: "User không tồn tại" });
    }

    // Prevent deleting admin themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ msg: "Không thể xóa tài khoản của chính mình" });
    }

    await user.destroy();

    res.status(200).json({ message: "User deleted successfully" });

  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// Get user by ID
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
