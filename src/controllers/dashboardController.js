const { Product } = require("../models/index");
const Order = require("../models/Order");
const User = require("../models/User");
const Review = require("../models/Review");
const { Op } = require("sequelize");
const sequelize = require("../config/db");

// Dashboard statistics for admin
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Tổng doanh thu - Từ đơn hàng đã giao (delivered)
    const revenueResult = await Order.sum('totalAmount', {
      where: { status: 'delivered' }
    });
    const totalRevenue = revenueResult || 0;

    // 2. Tổng số đơn hàng
    const totalOrders = await Order.count();

    // 3. Đơn hàng chờ xử lý (pending + paid)
    const pendingOrders = await Order.count({
      where: { 
        status: { [Op.in]: ['pending', 'paid'] }
      }
    });

    // 4. Tổng sản phẩm đã bán - Từ đơn hàng đã giao (delivered)
    const deliveredOrders = await Order.findAll({
      where: { status: 'delivered' },
      attributes: ['products'],
      raw: true
    });
    
    let totalProductsSold = 0;
    deliveredOrders.forEach(order => {
      const products = typeof order.products === 'string' 
        ? JSON.parse(order.products) 
        : order.products;
      if (Array.isArray(products)) {
        products.forEach(p => {
          totalProductsSold += (p.quantity || 1);
        });
      }
    });

    // 5. Tổng khách hàng
    const totalCustomers = await User.count({
      where: { role: 'customer' }
    });

    // 6. Khách mới tháng này
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newCustomers = await User.count({
      where: { 
        role: 'customer',
        createdAt: { [Op.gte]: startOfMonth }
      }
    });

    // 7. Biểu đồ doanh thu 7 ngày qua
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const revenueByDay = await Order.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
      ],
      where: {
        status: 'delivered',
        createdAt: { [Op.gte]: sevenDaysAgo }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Tạo mảng 7 ngày với label ngắn (T2, T3, CN...)
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const revenueChart = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabel = dayLabels[date.getDay()];
      
      const found = revenueByDay.find(r => r.date === dateStr);
      revenueChart.push({
        label: dayLabel,
        date: dateStr,
        value: found ? parseInt(found.revenue) : 0
      });
    }

    // 8. Top sản phẩm bán chạy - Từ đơn hàng đã giao
    const productSalesMap = {};
    deliveredOrders.forEach(order => {
      const products = typeof order.products === 'string' 
        ? JSON.parse(order.products) 
        : order.products;
      if (Array.isArray(products)) {
        products.forEach(p => {
          const key = p.productId || p.id;
          if (!productSalesMap[key]) {
            productSalesMap[key] = {
              productId: key,
              name: p.name,
              image: p.image,
              price: p.price,
              totalSold: 0,
              revenue: 0
            };
          }
          productSalesMap[key].totalSold += (p.quantity || 1);
          productSalesMap[key].revenue += (p.price || 0) * (p.quantity || 1);
        });
      }
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5)
      .map(p => ({
        _id: p.productId,
        name: p.name,
        image: p.image,
        totalSold: p.totalSold,
        revenue: p.revenue
      }));

    // 9. Đơn hàng gần đây (10 đơn mới nhất)
    const recentOrdersData = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const recentOrders = recentOrdersData.map(order => ({
      _id: order.id,
      orderCode: order.orderCode,
      user: order.user ? {
        _id: order.user.id,
        name: order.user.name
      } : null,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt
    }));

    // 10. Thống kê đơn hàng theo trạng thái
    const ordersByStatus = await Order.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const statusCounts = {
      pending: 0,
      paid: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0
    };

    ordersByStatus.forEach(item => {
      statusCounts[item.status] = parseInt(item.count);
    });

    res.status(200).json({
      // 4 thẻ thống kê đầu trang
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalProductsSold,
      totalCustomers,
      newCustomers,
      
      // Biểu đồ doanh thu 7 ngày
      revenueChart,
      
      // Top sản phẩm bán chạy (từ đơn đã giao)
      topSellingProducts,
      
      // Đơn hàng gần đây
      recentOrders,
      
      // Thống kê theo trạng thái (hỗ trợ cả 2 tên)
      orderStats: statusCounts,
      ordersByStatus: statusCounts
    });

  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
