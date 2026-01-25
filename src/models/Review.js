const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Review = sequelize.define("Review", {
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Products",
      key: "id"
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id"
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reply: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  repliedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Users",
      key: "id"
    }
  },
  repliedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});



module.exports = Review;
