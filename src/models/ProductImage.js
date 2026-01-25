const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductImage = sequelize.define("ProductImage", {
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Đường dẫn đến hình ảnh'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Hình ảnh chính'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Thứ tự hiển thị'
  },
  alt: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Mô tả hình ảnh'
  }
}, {
  tableName: 'product_images',
  timestamps: true,
  indexes: [
    {
      fields: ['productId', 'isPrimary']
    }
  ]
});

module.exports = ProductImage;
