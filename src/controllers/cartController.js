const { Product, ProductImage } = require("../models/index");
const { Op } = require("sequelize");

// Lấy giỏ hàng của user
exports.getCart = async (req, res) => {
  try {
    let cart = req.session.cart || [];

    if (cart.length > 0) {
      const productIds = cart.map(item => item.productId);
      const products = await Product.findAll({
        where: {
          id: { [Op.in]: productIds },
          isActive: true
        },
        include: [
          {
            model: ProductImage,
            as: 'images',
            where: { isPrimary: true },
            required: false,
            limit: 1
          }
        ]
      });

      cart = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          return null;
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            oldPrice: product.oldPrice,
            image: product.images?.[0]?.imageUrl 
              ? `${req.protocol}://${req.get('host')}/uploads/${product.images[0].imageUrl}`
              : null,
            stock: product.stock
          }
        };
      }).filter(item => item !== null);
    }

    const total = cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    res.status(200).json({
      cart,
      total,
      itemCount: cart.length
    });
  } catch (err) {
    console.error("Error getting cart:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// Thêm sản phẩm vào giỏ hàng
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ msg: "Vui lòng chọn sản phẩm" });
    }

    const product = await Product.findByPk(productId, {
      include: [
        {
          model: ProductImage,
          as: 'images',
          where: { isPrimary: true },
          required: false,
          limit: 1
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }

    if (!product.isActive) {
      return res.status(400).json({ msg: "Sản phẩm không còn hoạt động" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ 
        msg: `Sản phẩm không đủ số lượng (Còn ${product.stock})` 
      });
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingItemIndex = req.session.cart.findIndex(
      item => item.productId === productId
    );

    if (existingItemIndex !== -1) {
      const newQuantity = req.session.cart[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.stock) {
        return res.status(400).json({ 
          msg: `Số lượng vượt quá tồn kho (Còn ${product.stock})` 
        });
      }

      req.session.cart[existingItemIndex].quantity = newQuantity;
    } else {
      req.session.cart.push({
        productId: productId,
        quantity: quantity
      });
    }

    res.status(200).json({
      msg: "Thêm vào giỏ hàng thành công",
      cart: req.session.cart,
      itemCount: req.session.cart.length
    });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// Thêm nhiều sản phẩm vào giỏ hàng
exports.addMultipleToCart = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: "Vui lòng chọn ít nhất một sản phẩm" });
    }

    const productIds = items.map(item => item.productId).filter(Boolean);
    
    if (productIds.length === 0) {
      return res.status(400).json({ msg: "Vui lòng chọn sản phẩm hợp lệ" });
    }

    const products = await Product.findAll({
      where: {
        id: { [Op.in]: productIds },
        isActive: true
      }
    });

    const errors = [];
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        errors.push(`Sản phẩm ID ${item.productId} không tồn tại`);
        continue;
      }

      const quantity = item.quantity || 1;
      if (product.stock < quantity) {
        errors.push(`Sản phẩm "${product.name}" không đủ số lượng (Còn ${product.stock})`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        msg: "Có lỗi xảy ra", 
        errors 
      });
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const addedItems = [];
    for (const item of items) {
      const productId = item.productId;
      const quantity = item.quantity || 1;

      const existingItemIndex = req.session.cart.findIndex(
        cartItem => cartItem.productId === productId
      );

      if (existingItemIndex !== -1) {
        const product = products.find(p => p.id === productId);
        const newQuantity = req.session.cart[existingItemIndex].quantity + quantity;
        
        if (newQuantity > product.stock) {
          errors.push(`Sản phẩm "${product.name}" vượt quá tồn kho (Còn ${product.stock})`);
          continue;
        }

        req.session.cart[existingItemIndex].quantity = newQuantity;
        addedItems.push({ productId, quantity: newQuantity, action: 'updated' });
      } else {
        req.session.cart.push({
          productId: productId,
          quantity: quantity
        });
        addedItems.push({ productId, quantity, action: 'added' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        msg: "Có lỗi xảy ra", 
        errors,
        addedItems 
      });
    }

    res.status(200).json({
      msg: "Thêm vào giỏ hàng thành công",
      addedItems,
      cart: req.session.cart,
      itemCount: req.session.cart.length
    });
  } catch (err) {
    console.error("Error adding multiple to cart:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// Cập nhật số lượng sản phẩm trong giỏ hàng
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ msg: "Vui lòng chọn sản phẩm" });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ msg: "Số lượng phải lớn hơn 0" });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ 
        msg: `Số lượng vượt quá tồn kho (Còn ${product.stock})` 
      });
    }

    if (!req.session.cart) {
      return res.status(404).json({ msg: "Giỏ hàng trống" });
    }

    const itemIndex = req.session.cart.findIndex(
      item => item.productId === parseInt(productId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ msg: "Sản phẩm không có trong giỏ hàng" });
    }

    req.session.cart[itemIndex].quantity = quantity;

    res.status(200).json({
      msg: "Cập nhật giỏ hàng thành công",
      cart: req.session.cart,
      itemCount: req.session.cart.length
    });
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// Xóa sản phẩm khỏi giỏ hàng
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!req.session.cart || req.session.cart.length === 0) {
      return res.status(404).json({ msg: "Giỏ hàng trống" });
    }

    const itemIndex = req.session.cart.findIndex(
      item => item.productId === parseInt(productId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ msg: "Sản phẩm không có trong giỏ hàng" });
    }

    req.session.cart.splice(itemIndex, 1);

    res.status(200).json({
      msg: "Xóa sản phẩm khỏi giỏ hàng thành công",
      cart: req.session.cart,
      itemCount: req.session.cart.length
    });
  } catch (err) {
    console.error("Error removing from cart:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res) => {
  try {
    req.session.cart = [];

    res.status(200).json({
      msg: "Xóa giỏ hàng thành công",
      cart: []
    });
  } catch (err) {
    console.error("Error clearing cart:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

