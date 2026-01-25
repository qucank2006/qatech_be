const { Product } = require("../models/index");
const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");
const { Op } = require("sequelize");


// Lấy danh sách đánh giá của sản phẩm
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const reviews = await Review.findAll({
      where: { productId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "avatar"]
        },
        {
          model: User,
          as: "replier",
          attributes: ["id", "name", "role"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });


    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;


    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    res.status(200).json({
      reviews,
      stats: {
        totalReviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingDistribution
      }
    });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Kiểm tra user đã mua sản phẩm chưa
exports.checkPurchase = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;


    const orders = await Order.findAll({
      where: {
        userId,
        status: 'completed'
      }
    });

    let hasPurchased = false;
    for (const order of orders) {
      const products = order.products || [];
      if (products.some(p => p.productId == productId)) {
        hasPurchased = true;
        break;
      }
    }


    const existingReview = await Review.findOne({
      where: { userId, productId }
    });

    res.status(200).json({
      hasPurchased,
      hasReviewed: !!existingReview,
      canReview: hasPurchased && !existingReview
    });
  } catch (err) {
    console.error("Error checking purchase:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Tạo đánh giá mới
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;


    if (!productId || !rating || !comment) {
      return res.status(400).json({ msg: "Vui lòng điền đầy đủ thông tin" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating phải từ 1-5 sao" });
    }


    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }


    const existingReview = await Review.findOne({
      where: { userId, productId }
    });

    if (existingReview) {
      return res.status(400).json({ msg: "Bạn đã đánh giá sản phẩm này rồi" });
    }


    const orders = await Order.findAll({
      where: {
        userId,
        status: 'completed'
      }
    });

    let hasPurchased = false;
    for (const order of orders) {
      const products = order.products || [];
      if (products.some(p => p.productId == productId)) {
        hasPurchased = true;
        break;
      }
    }

    if (!hasPurchased) {
      return res.status(403).json({ msg: "Bạn chưa mua sản phẩm này" });
    }


    const review = await Review.create({
      productId,
      userId,
      rating,
      comment
    });


    const reviewWithUser = await Review.findByPk(review.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "avatar"]
        }
      ]
    });

    res.status(201).json({
      msg: "Đánh giá thành công",
      review: reviewWithUser
    });
  } catch (err) {
    console.error("Error creating review:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Phản hồi đánh giá
exports.replyReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;


    if (userRole !== 'admin' && userRole !== 'employee') {
      return res.status(403).json({ msg: "Chỉ admin hoặc nhân viên mới có thể phản hồi" });
    }

    if (!reply || reply.trim() === '') {
      return res.status(400).json({ msg: "Nội dung phản hồi không được để trống" });
    }


    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({ msg: "Đánh giá không tồn tại" });
    }


    await review.update({
      reply,
      repliedBy: userId,
      repliedAt: new Date()
    });


    const updatedReview = await Review.findByPk(reviewId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "avatar"]
        },
        {
          model: User,
          as: "replier",
          attributes: ["id", "name", "role"]
        }
      ]
    });

    res.status(200).json({
      msg: "Phản hồi thành công",
      review: updatedReview
    });
  } catch (err) {
    console.error("Error replying review:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};


// Xóa đánh giá
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({ msg: "Đánh giá không tồn tại" });
    }


    if (userRole !== 'admin' && userRole !== 'employee' && review.userId !== userId) {
      return res.status(403).json({ msg: "Bạn không có quyền xóa đánh giá này" });
    }

    await review.destroy();

    res.status(200).json({ msg: "Xóa đánh giá thành công" });
  } catch (err) {
    console.error("Error deleting review:", err);
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
