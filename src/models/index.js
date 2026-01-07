const Product = require('./Product');
const ProductSpecification = require('./ProductSpecification');
const ProductImage = require('./ProductImage');
const Review = require('./Review');
const User = require('./User');
const Order = require('./Order');

// Thiết lập quan hệ giữa các bảng

// Product - ProductSpecification (1-1)
Product.hasOne(ProductSpecification, {
  foreignKey: 'productId',
  as: 'specifications',
  onDelete: 'CASCADE'
});
ProductSpecification.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

// Product - ProductImage (1-n)
Product.hasMany(ProductImage, {
  foreignKey: 'productId',
  as: 'images',
  onDelete: 'CASCADE'
});
ProductImage.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'productInfo'
});

// Product - Review (1-n)
Product.hasMany(Review, {
  foreignKey: 'productId',
  as: 'reviews',
  onDelete: 'CASCADE'
});
Review.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

// User - Review (1-n)
User.hasMany(Review, {
  foreignKey: 'userId',
  as: 'reviews',
  onDelete: 'CASCADE'
});
Review.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User - Review (replier relationship)
Review.belongsTo(User, {
  foreignKey: 'repliedBy',
  as: 'replier'
});

module.exports = {
  Product,
  ProductSpecification,
  ProductImage,
  Review,
  User,
  Order
};
