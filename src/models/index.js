const Product = require('./Product');
const ProductSpecification = require('./ProductSpecification');
const ProductImage = require('./ProductImage');
const Review = require('./Review');
const User = require('./User');
const Order = require('./Order');




Product.hasOne(ProductSpecification, {
  foreignKey: 'productId',
  as: 'specifications',
  onDelete: 'CASCADE'
});
ProductSpecification.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});


Product.hasMany(ProductImage, {
  foreignKey: 'productId',
  as: 'images',
  onDelete: 'CASCADE'
});
ProductImage.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'productInfo'
});


Product.hasMany(Review, {
  foreignKey: 'productId',
  as: 'reviews',
  onDelete: 'CASCADE'
});
Review.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});


User.hasMany(Review, {
  foreignKey: 'userId',
  as: 'reviews',
  onDelete: 'CASCADE'
});
Review.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});


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
