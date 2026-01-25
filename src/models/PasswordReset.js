
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PasswordReset = sequelize.define('PasswordReset', {
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  otp: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'PasswordResets',
  timestamps: false
});

module.exports = PasswordReset;
