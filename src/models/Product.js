const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Product = sequelize.define("Product", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tên sản phẩm'
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Đường dẫn thân thiện'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mô tả sản phẩm'
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Giá hiện tại'
  },
  oldPrice: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Giá cũ (để hiển thị khuyến mãi)'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Danh mục: laptop, linh-kien, phu-kien'
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Thương hiệu'
  },
  usage: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Mục đích sử dụng: gaming, van-phong, do-hoa'
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Số lượng tồn kho'
  },
  sold: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Số lượng đã bán'
  },
  subCategory: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Danh mục phụ: cpu, ram, gpu, storage, cooling, case, psu, mainboard'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Trạng thái hoạt động'
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    {
      fields: ['slug'],
      unique: true
    },
    {
      fields: ['category', 'brand']
    },
    {
      fields: ['price']
    }
  ]
});

module.exports = Product;
