const { Product } = require("../models/index");
const Order = require("../models/Order");
const User = require("../models/User");
const Review = require("../models/Review");
const { Op } = require("sequelize");
const sequelize = require("../config/db");

// Lấy thống kê dashboard cho admin
exports.getDashboardStats = async (req, res) => {
  try {
    const revenueResult = await Order.sum('totalAmount', {
      where: { status: 'delivered' }
    });
    const totalRevenue = revenueResult || 0;

    const totalOrders = await Order.count();

    const pendingOrders = await Order.count({
      where: { 
        status: { [Op.in]: ['pending', 'paid'] }
      }
    });

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

    const totalCustomers = await User.count({
      where: { role: 'customer' }
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newCustomers = await User.count({
      where: { 
        role: 'customer',
        createdAt: { [Op.gte]: startOfMonth }
      }
    });

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
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalProductsSold,
      totalCustomers,
      newCustomers,
      revenueChart,
      topSellingProducts,
      recentOrders,
      orderStats: statusCounts,
      ordersByStatus: statusCounts
    });

  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
