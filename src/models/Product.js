const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Product = sequelize.define("Product", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  oldPrice: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  usage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sold: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Thông số kỹ thuật chi tiết
  cpuType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ramCapacity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ramType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ramSlots: {
    type: DataTypes.STRING,
    allowNull: true
  },
  storage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  battery: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gpuType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  screenSize: {
    type: DataTypes.STRING,
    allowNull: true
  },
  screenTechnology: {
    type: DataTypes.STRING,
    allowNull: true
  },
  screenResolution: {
    type: DataTypes.STRING,
    allowNull: true
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ports: {
    type: DataTypes.STRING,
    allowNull: true
  },
  otherSpecs: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Product;
