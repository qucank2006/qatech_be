# QATech Backend - API Documentation

## Tổng quan

Backend API cho hệ thống thương mại điện tử QATech, xây dựng bằng Node.js, Express, MySQL và Sequelize.

##  Quick Start

### 1. Cài đặt

```bash
npm install
```

### 2. Cấu hình Environment

Tạo file `.env`:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=qatech_db

# JWT
JWT_SECRET=your_jwt_secret_key

# Server
PORT=5000

# VNPay Payment Gateway
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay-return
VNPAY_IPN_URL=http://localhost:5000/api/payments/vnpay-ipn
```

### 3. Khởi động

```bash
# Development
npm run dev

# Production
npm start
```

## 📂 Cấu trúc Project

```
qatech_backend/
├── src/
│   ├── config/         # Database & configs
│   ├── controllers/    # Business logic
│   ├── middlewares/    # Auth, upload, etc.
│   ├── models/         # Sequelize models
│   ├── routes/         # API routes
│   ├── services/       # Services layer
│   └── utils/          # Helper functions
├── uploads/            # Uploaded files
├── server.js           # Entry point
└── package.json
```

## 🔐 Authentication

Sử dụng JWT tokens:

```javascript
// Headers
Authorization: Bearer <token>
```

### Roles
- **admin**: Toàn quyền quản trị
- **employee**: Quản lý đơn hàng
- **customer**: Người dùng thường

## 📌 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password/:token` - Reset mật khẩu

### Products
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/products/:id` - Chi tiết sản phẩm (ID hoặc slug)
- `POST /api/products` - Tạo sản phẩm (Admin)
- `PUT /api/products/:id` - Cập nhật sản phẩm (Admin)
- `DELETE /api/products/:id` - Xóa sản phẩm (Admin)

### Orders
- `POST /api/orders` - Tạo đơn hàng
- `GET /api/orders` - Lấy đơn hàng của user
- `GET /api/orders/:id` - Chi tiết đơn hàng
- `GET /api/orders/all` - Tất cả đơn hàng (Admin)
- `PUT /api/orders/:id/status` - Cập nhật trạng thái (Admin/Employee)

### Reviews
- `GET /api/reviews/product/:productId` - Đánh giá của sản phẩm
- `POST /api/reviews` - Tạo đánh giá
- `PUT /api/reviews/:id` - Sửa đánh giá
- `DELETE /api/reviews/:id` - Xóa đánh giá
- `POST /api/reviews/:id/reply` - Admin trả lời đánh giá

### Payments
- `POST /api/payments/create` - Tạo thanh toán VNPay
- `GET /api/payments/vnpay-ipn` - IPN Webhook từ VNPay
- `GET /api/payments/vnpay-return` - Return URL kết quả thanh toán
- `GET /api/payments/:orderId/status` - Kiểm tra trạng thái

### Users (Admin)
- `GET /api/users` - Danh sách users
- `GET /api/users/:id` - Chi tiết user
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user
- `PUT /api/users/:id/toggle-active` - Bật/tắt tài khoản

### Dashboard (Admin)
- `GET /api/dashboard/stats` - Thống kê tổng quan

## 🗄️ Database Schema

### products
- Thông tin cơ bản: id, name, slug, description, price, category, brand, stock, sold

### product_specifications
- Thông số kỹ thuật: cpuType, ramCapacity, storage, gpuType, screenSize, specs (JSON)

### product_images
- Quản lý ảnh: productId, imageUrl, isPrimary, order, alt

### orders
- Đơn hàng: userId, items (JSON), totalAmount, status, paymentStatus

### reviews
- Đánh giá: productId, userId, rating, comment, reply, repliedBy

### users
- Người dùng: name, email, password, role, isActive

## 🔧 Utilities & Helpers

### File Upload
```javascript
// Middleware upload
const upload = require('./middlewares/upload');

// Route
router.post('/products', upload.array('images', 5), createProduct);
```

### Helpers
```javascript
const { 
  createSlug,        // Tạo slug từ tiếng Việt
  deleteFile,        // Xóa file an toàn
  safeJSONParse,     // Parse JSON an toàn
  removeUndefined    // Xóa undefined keys
} = require('./utils/helpers');
```

## 📊 Query Optimization

### Include Relations
```javascript
const product = await Product.findOne({
  where: { id },
  include: [
    { model: ProductSpecification, as: 'specifications' },
    { model: ProductImage, as: 'images' }
  ]
});
```

### Pagination
```javascript
const { page = 1, limit = 10 } = req.query;
const offset = (page - 1) * limit;

const products = await Product.findAndCountAll({
  limit,
  offset,
  order: [['createdAt', 'DESC']]
});
```

## 🐛 Error Handling

Tất cả endpoints trả về format nhất quán:

### Success Response
```json
{
  "msg": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "msg": "Error message",
  "error": "Error details"
}
```

## 🔒 Security

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation
- ✅ SQL injection protection (Sequelize)
- ✅ File upload validation
- ✅ CORS configuration

## 🧪 Testing

```bash
# Test API endpoints
npm test
```

## 📦 Dependencies

### Core
- express - Web framework
- sequelize - ORM
- mysql2 - MySQL driver
- jsonwebtoken - JWT authentication
- bcryptjs - Password hashing

### Utilities
- dotenv - Environment variables
- multer - File upload
- nodemailer - Email service
- axios - HTTP client

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Sử dụng strong JWT_SECRET
- [ ] Enable SSL/HTTPS
- [ ] Configure CORS properly
- [ ] Setup backup cho database
- [ ] Monitor logs
- [ ] Rate limiting

### PM2 Deployment
```bash
pm2 start server.js --name qatech-api
pm2 save
pm2 startup
```

## 📝 Migration

### Chạy migration
```bash
node migrate-products-normalization.js
```

## 🤝 Contributing

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

Private - QATech Team

## 📞 Support

Contact: support@qatech.com
