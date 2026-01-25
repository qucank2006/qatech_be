const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductSpecification = sequelize.define("ProductSpecification", {

  cpuType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Loại CPU'
  },
  ramCapacity: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Dung lượng RAM'
  },
  ramType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Loại RAM (DDR4, DDR5, etc.)'
  },
  ramSlots: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Số khe RAM'
  },
  storage: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Dung lượng lưu trữ'
  },
  battery: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Pin'
  },
  gpuType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Card đồ họa'
  },
  screenSize: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Kích thước màn hình'
  },
  screenTechnology: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Công nghệ màn hình'
  },
  screenResolution: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Độ phân giải màn hình'
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hệ điều hành'
  },
  ports: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cổng kết nối'
  },
  otherSpecs: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Thông số khác'
  },

  type: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Loại sản phẩm: cpu, ram, gpu, storage, cooling, case, psu, mainboard'
  },
  specs: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Thông số kỹ thuật linh hoạt theo từng loại sản phẩm'
  }
}, {
  tableName: 'product_specifications',
  timestamps: true
});

module.exports = ProductSpecification;
