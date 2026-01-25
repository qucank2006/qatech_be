const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const sequelize = require("../config/db");
const { Op } = require("sequelize");

function generateOrderCode() {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function addStatusHistory(order, status, updatedBy, note = '') {
  const history = order.statusHistory || [];
  history.push({
    status,
    updatedBy,
    note,
    updatedAt: new Date()
  });
  return history;
}

exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { items, shippingAddress, paymentMethod, note } = req.body;
    const userId = req.user.id;


    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ msg: "Giỏ hàng trống" });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
      await transaction.rollback();
      return res.status(400).json({ msg: "Vui lòng điền đầy đủ thông tin giao hàng" });
    }


    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction });
      
      if (!product) {
        await transaction.rollback();
        return res.status(400).json({ msg: `Sản phẩm ID ${item.productId} không tồn tại` });
      }
      
      if (product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ 
          msg: `Sản phẩm "${product.name}" không đủ số lượng (Còn ${product.stock})` 
        });
      }
      

      await product.update(
        { 
          stock: product.stock - item.quantity,
          sold: (product.sold || 0) + item.quantity
        },
        { transaction }
      );
    }


    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);


    const orderCode = generateOrderCode();


    const order = await Order.create({
      userId,
      orderCode,
      products: items,
      totalAmount,
      shippingAddress,
      phone: shippingAddress.phone,
      paymentMethod: paymentMethod || 'cod',
      note,
      status: 'pending',
      paymentStatus: 'unpaid',
      statusHistory: [{
        status: 'pending',
        updatedBy: 'system',
        note: 'Đơn hàng được tạo',
        updatedAt: new Date()
      }]
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      msg: "Tạo đơn hàng thành công",
      order: {
        id: order.id,
        orderCode: order.orderCode,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error creating order:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Lấy danh sách đơn hàng của user
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const whereClause = { userId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalOrders: count,
        hasMore: offset + orders.length < count
      }
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Lấy chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ msg: "Đơn hàng không tồn tại" });
    }


    if (userRole !== 'admin' && userRole !== 'employee' && order.userId !== userId) {
      return res.status(403).json({ msg: "Bạn không có quyền xem đơn hàng này" });
    }

    res.status(200).json({ order });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Lấy tất cả đơn hàng (Admin/Employee)
exports.getAllOrders = async (req, res) => {
  try {
    const { 
      status, 
      paymentStatus,
      paymentMethod,
      search,
      dateFrom,
      dateTo,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      whereClause.paymentStatus = paymentStatus;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      whereClause.paymentMethod = paymentMethod;
    }
    

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {

        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        whereClause.createdAt[Op.lt] = endDate;
      }
    }
    
    if (search) {
      whereClause[Op.or] = [
        { orderCode: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });


    const statistics = await Order.findAll({
      attributes: [
        [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'totalOrders'],
        [Order.sequelize.fn('SUM', Order.sequelize.col('totalAmount')), 'totalRevenue'],
        'status'
      ],
      group: ['status']
    });

    const stats = {
      pending: 0,
      paid: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0
    };

    statistics.forEach(stat => {
      const status = stat.dataValues.status;
      const count = parseInt(stat.dataValues.totalOrders);
      stats[status] = count;
      if (stat.dataValues.totalRevenue) {
        stats.totalRevenue += parseInt(stat.dataValues.totalRevenue);
      }
    });

    res.status(200).json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalOrders: count,
        hasMore: offset + orders.length < count
      },
      statistics: stats
    });
  } catch (err) {
    console.error("Error fetching all orders:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    const updatedBy = req.user.name || req.user.email;


    const validStatuses = ['pending', 'paid', 'processing', 'shipping', 'delivered'];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ msg: "Trạng thái không hợp lệ. Admin/Nhân viên không được phép hủy đơn hàng." });
    }

    const order = await Order.findByPk(orderId, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ msg: "Đơn hàng không tồn tại" });
    }


    if (order.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({ msg: "Không thể cập nhật đơn hàng đã bị hủy" });
    }


    const newHistory = addStatusHistory(order, status, updatedBy, note);

    await order.update({ 
      status,
      statusHistory: newHistory
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      msg: "Cập nhật trạng thái thành công",
      order: {
        id: order.id,
        status: order.status,
        updatedAt: order.updatedAt
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error updating order status:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Hủy đơn hàng
exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findByPk(orderId, { transaction });
    
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ msg: "Đơn hàng không tồn tại" });
    }


    if (order.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({ msg: "Bạn không có quyền hủy đơn hàng này" });
    }


    if (!['pending', 'paid'].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ msg: "Không thể hủy đơn hàng đang được xử lý" });
    }


    const items = order.products;
    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          await product.update(
            { 
              stock: product.stock + item.quantity,
              sold: Math.max(0, (product.sold || 0) - item.quantity)
            },
            { transaction }
          );
        }
      }
    }


    const newHistory = addStatusHistory(order, 'cancelled', req.user.name || req.user.email, reason);

    await order.update({
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: new Date(),
      cancelledBy: userId,
      statusHistory: newHistory
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      msg: "Hủy đơn hàng thành công",
      order: {
        id: order.id,
        status: order.status,
        cancelReason: order.cancelReason,
        cancelledAt: order.cancelledAt
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error cancelling order:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Thống kê đơn hàng
exports.getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }


    const totalOrders = await Order.count({ where: whereClause });
    const totalRevenue = await Order.sum('totalAmount', { 
      where: { 
        ...whereClause,
        paymentStatus: 'paid'
      }
    }) || 0;
    
    const deliveredOrders = await Order.count({
      where: { ...whereClause, status: 'delivered' }
    });


    const byStatus = await Order.findAll({
      where: whereClause,
      attributes: [
        'status',
        [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const statusStats = {};
    byStatus.forEach(item => {
      statusStats[item.status] = parseInt(item.dataValues.count);
    });


    const byPaymentMethod = await Order.findAll({
      where: whereClause,
      attributes: [
        'paymentMethod',
        [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']
      ],
      group: ['paymentMethod']
    });

    const paymentStats = {};
    byPaymentMethod.forEach(item => {
      paymentStats[item.paymentMethod] = parseInt(item.dataValues.count);
    });

    res.status(200).json({
      summary: {
        totalOrders,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        completionRate: totalOrders > 0 ? (deliveredOrders / totalOrders).toFixed(2) : 0
      },
      byStatus: statusStats,
      byPaymentMethod: paymentStats
    });
  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
