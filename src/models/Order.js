const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const Order = sequelize.define("Order", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id"
    }
  },
  orderCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Mã đơn hàng duy nhất (ORD + timestamp)'
  },
  products: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Format: [{ productId, name, price, quantity, image }]'
  },
  totalAmount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'processing', 'shipping', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Format: { fullName, phone, address, ward, district, city }'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ghi chú của khách hàng'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    defaultValue: 'cod'
  },
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
    defaultValue: 'unpaid'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Transaction ID từ VNPay hoặc payment gateway khác'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  statusHistory: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Lịch sử thay đổi trạng thái: [{ status, updatedBy, note, updatedAt }]'
  },
  cancelReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Lý do hủy đơn hàng'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID người hủy đơn'
  }
});


Order.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = Order;
